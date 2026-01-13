import requests
import pandas as pd
import io

# Create a dummy dataframe
data = {
    'Asset Name': ['Alipay Balance', '招商银行', 'Bitcoin'],
    'Amount (CNY)': [5000.50, 120000, 350000]
}
df = pd.DataFrame(data)

# Save to Excel bytes
output = io.BytesIO()
with pd.ExcelWriter(output, engine='openpyxl') as writer:
    df.to_excel(writer, index=False)
output.seek(0)

# Send request
files = {'file': ('test_assets.xlsx', output, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
try:
    response = requests.post('http://localhost:3001/api/import/upload', files=files)
    print("Status Code:", response.status_code)
    print("Response:", response.json())
except Exception as e:
    print("Error:", e)
