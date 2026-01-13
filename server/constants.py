DEFAULT_ASSET_TYPES = [
  # 流动性资产 (Liquid)
  { "id": 'bank_card', "name": '银行卡', "category": 'liquid', "parentCategory": 'assets', "icon": 'CreditCard' },
  { "id": 'alipay', "name": '支付宝', "category": 'liquid', "parentCategory": 'assets', "icon": 'Wallet' },
  { "id": 'wechat', "name": '微信', "category": 'liquid', "parentCategory": 'assets', "icon": 'MessageCircle' },
  { "id": 'cash_other', "name": '现金其他', "category": 'liquid', "parentCategory": 'assets', "icon": 'Coins' },

  # 稳健型资产 (Safe)
  { "id": 'deposit', "name": '定期存款', "category": 'safe', "parentCategory": 'assets', "icon": 'Lock' },
  { "id": 'bond', "name": '债券', "category": 'safe', "parentCategory": 'assets', "icon": 'FileText' },
  { "id": 'money_fund', "name": '货币基金', "category": 'safe', "parentCategory": 'assets', "icon": 'DollarSign' },

  # 权益类资产 (Equity)
  { "id": 'a_stock', "name": 'A股账户', "category": 'equity', "parentCategory": 'assets', "icon": 'BarChart2' },
  { "id": 'hk_stock', "name": '港股账户', "category": 'equity', "parentCategory": 'assets', "icon": 'BarChart2' },
  { "id": 'us_stock', "name": '美股账户', "category": 'equity', "parentCategory": 'assets', "icon": 'TrendingUp' },
  { "id": 'fund', "name": '公募基金', "category": 'equity', "parentCategory": 'assets', "icon": 'PieChart' },

  # 风险资产 (Risk)
  { "id": 'binance', "name": 'Binance', "category": 'risk', "parentCategory": 'assets', "icon": 'Bitcoin' },
  { "id": 'okx', "name": 'OKX', "category": 'risk', "parentCategory": 'assets', "icon": 'Bitcoin' },
  { "id": 'wallet', "name": '链上钱包', "category": 'risk', "parentCategory": 'assets', "icon": 'Wallet' },

  # 其他资产 (Other)
  { "id": 'real_estate', "name": '房产', "category": 'other', "parentCategory": 'assets', "icon": 'Home' },
  { "id": 'car', "name": '汽车', "category": 'other', "parentCategory": 'assets', "icon": 'Car' },
  { "id": 'gold', "name": '黄金', "category": 'other', "parentCategory": 'assets', "icon": 'Gem' },
  { "id": 'collectibles', "name": '收藏品', "category": 'other', "parentCategory": 'assets', "icon": 'Award' },

  # 负债 (Liabilities)
  { "id": 'credit_card', "name": '信用卡', "category": 'liability', "parentCategory": 'liabilities', "icon": 'CreditCard' },
  { "id": 'huabei', "name": '花呗', "category": 'liability', "parentCategory": 'liabilities', "icon": 'ShoppingBag' },
  { "id": 'mortgage', "name": '房贷', "category": 'liability', "parentCategory": 'liabilities', "icon": 'Home' },
  { "id": 'car_loan', "name": '车贷', "category": 'liability', "parentCategory": 'liabilities', "icon": 'Car' },
  { "id": 'consumer_loan', "name": '消费贷', "category": 'liability', "parentCategory": 'liabilities', "icon": 'FileText' },
  { "id": 'margin', "name": '融资融券', "category": 'liability', "parentCategory": 'liabilities', "icon": 'Scale' },
]
