import pandas as pd
import io
import os
from openai import OpenAI
import json
import logging
import math

# Set up logging
logger = logging.getLogger(__name__)

def sanitize_results(results):
    clean_results = []
    for item in results:
        amount = item.get('amount')
        if isinstance(amount, float) and (math.isnan(amount) or math.isinf(amount)):
            amount = 0.0
        item['amount'] = amount
        clean_results.append(item)
    return clean_results

async def parse_file(file_content: bytes, filename: str, use_ai: bool = False):
    """
    Parses an uploaded file (Excel or CSV) and extracts asset data.
    Returns a list of dicts: [{ "name": str, "amount": float, "category": str|None }]
    """
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file format")
            
        # Check if df is empty (might happen if file has 1 row and it was treated as header)
        if df.empty:
            logger.info("Dataframe empty, retrying with header=None")
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content), header=None)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(io.BytesIO(file_content), header=None)

        # Clean data: drop completely empty rows/cols
        df.dropna(how='all', inplace=True)
        df.dropna(axis=1, how='all', inplace=True)
        
        # Ensure we have data
        if df.empty:
             logger.warning("File contains no data")
             return []

        if use_ai:
             # Basic check if API key exists, otherwise fallback
            api_key = os.getenv("DEEPSEEK_API_KEY") 
            if api_key:
                return await ai_parse(df, api_key)
            else:
                 logger.warning("DeepSeek API key not found, falling back to heuristic parsing")

        return heuristic_parse(df)
        
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        raise e

async def parse_text(text_content: str, use_ai: bool = False):
    """
    Parses pasted text content (CSV-like or tab-separated) and extracts asset data.
    """
    try:
        # Try to infer structure using pandas' python engine which is more flexible
        try:
            df = pd.read_csv(io.StringIO(text_content), sep=None, engine='python')
        except:
             # Fallback to simple comma or tab if auto-detection fails drastically
             try:
                 df = pd.read_csv(io.StringIO(text_content), sep='\t')
             except:
                 df = pd.read_csv(io.StringIO(text_content), sep=',')
        
        # Clean data
        df.dropna(how='all', inplace=True)
        df.dropna(axis=1, how='all', inplace=True)

        if df.empty:
             logger.warning("Text contains no table data")
             return []

        if use_ai:
            api_key = os.getenv("DEEPSEEK_API_KEY") 
            if api_key:
                return await ai_parse(df, api_key)
            else:
                 logger.warning("DeepSeek API key not found, falling back to heuristic parsing")

        return heuristic_parse(df)

    except Exception as e:
        logger.error(f"Error parsing text: {e}")
        raise e

def heuristic_parse(df: pd.DataFrame):
    """
    Heuristically attempts to identify Name and Amount columns.
    Strategy:
    1. Look for column names containing 'name', 'asset', 'title' (case-insensitive).
    2. Look for column names containing 'amount', 'balance', 'value', 'price'.
    3. If not found in headers, check first few rows for data types (string vs number).
    """
    
    # 1. Normalize headers
    df.columns = df.columns.astype(str)
    headers = [c.lower() for c in df.columns]
    
    results = [] # Initialize results list here
    name_col = None
    amount_col = None
    
    # Simple keyword matching
    for col in df.columns:
        c_lower = col.lower()
        if not name_col and any(x in c_lower for x in ['name', 'asset', 'item', '名称', '资产']):
            name_col = col
        if not amount_col and any(x in c_lower for x in ['amount', 'balance', 'value', 'price', '金额', '余额', '市值']):
            amount_col = col
            
    # Fallback: Type inference
    # If explicit headers failed, scan columns for types
    if not name_col or not amount_col:
        # Strategy: Multi-column scanning
        # Check if we have multiple pairs of (String, Number) columns
        # This handles the case: Name | Amount | Name | Amount | ...
        
        num_cols = len(df.columns)
        used_cols = set()
        
        for i in range(num_cols - 1):
            if i in used_cols or (i+1) in used_cols:
                continue
                
            col1 = df.columns[i]
            col2 = df.columns[i+1]
            
            # Check types
            # Col1 should be string-like (names)
            # Col2 should be numeric-like (amounts)
            
            try:
                # simple heuristic: convert to numeric, count NaNs. 
                # If col1 has many NaNs when converted to numeric, it's likely text.
                # If col2 has few NaNs, it's likely number.
                
                s1 = pd.to_numeric(df[col1], errors='coerce')
                s2 = pd.to_numeric(df[col2], errors='coerce')
                
                # Check ratio of valid numbers. 
                # We expect col2 to be mostly numbers (ignoring empty cells)
                # We expect col1 to be mostly text (so s1 should have high NaN count)
                
                count2 = df[col2].notna().sum()
                if count2 == 0: continue # Empty column
                
                valid_nums2 = s2.notna().sum()
                valid_nums1 = s1.notna().sum()
                
                ratio2 = valid_nums2 / count2 if count2 > 0 else 0
                
                # Heuristic thresholds
                is_amount_col = ratio2 > 0.5  # At least 50% of non-empty cells are numbers
                is_text_col = valid_nums1 < (df[col1].notna().sum() * 0.8) # Less than 80% are numbers (so mostly text)
                
                if is_text_col and is_amount_col:
                    used_cols.add(i)
                    used_cols.add(i+1)
                    
                    # Extract from this pair
                    for _, row in df.iterrows():
                        n = str(row[col1]).strip()
                        a_raw = str(row[col2])
                        
                        # filter out basic headers repeated in data?
                        if not n or n.lower() in ['nan', 'none', '', '名称', 'name', 'total', '总计', '总']: continue
                        
                        try:
                            clean_a = a_raw.replace(',', '').replace('¥', '').replace('$', '').strip()
                            if not clean_a: continue
                            val = float(clean_a)
                            results.append({
                                "name": n,
                                "amount": val,
                                "category": None
                            })
                        except:
                            continue
            except:
                continue
                
        if results:
            return sanitize_results(results)

        # If multi-column didn't work, fall back to single column search (original logic)
        for col in df.columns:
            # Check if column is numeric
            is_numeric = pd.to_numeric(df[col], errors='coerce').notna().mean() > 0.8
            if not amount_col and is_numeric:
                amount_col = col
            elif not name_col and not is_numeric:
                # Assume non-numeric with high cardinality is name
                if df[col].nunique() > 1:
                    name_col = col
                    
    if name_col and amount_col:
        for _, row in df.iterrows():
            try:
                name = str(row[name_col]).strip()
                # Clean amount string (remove currency symbols, commas)
                raw_amount = str(row[amount_col])
                clean_amount = raw_amount.replace(',', '').replace('¥', '').replace('$', '').strip()
                amount = float(clean_amount)
                
                if name and name.lower() != 'nan':
                     results.append({
                        "name": name,
                        "amount": amount,
                        "category": None # Category detection is hard without AI
                    })
            except (ValueError, TypeError):
                continue
                
    return sanitize_results(results)



async def ai_parse(df: pd.DataFrame, api_key: str):
    """
    Uses DeepSeek (OpenAI compatible) to analyze the dataframe structure and extract data.
    Sending just the head of the dataframe to save tokens and privacy, 
    or the whole thing if small.
    """
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com" 
    )
    
    # Convert dataframe to CSV string for context
    # Limit to first 50 rows to avoid token limits if file is huge
    csv_preview = df.head(50).to_csv(index=False)
    
    prompt = f"""
    You are a data parser helper. Extract financial asset data from the following CSV content.
    Return a JSON object with a key 'assets' containing a list of objects.
    Each object must have: 'name' (string), 'amount' (number), and 'category' (string, optional).
    Try to infer the category from the name (e.g. 'Cash', 'Stock', 'Crypto', 'Liability').
    
    CSV Content:
    {csv_preview}
    
    Return ONLY valid JSON.
    """
    
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs only JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        return sanitize_results(data.get('assets', []))
        
    except Exception as e:
        logger.error(f"AI parsing failed: {e}")
        # Fallback
        return heuristic_parse(df)
