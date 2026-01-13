# 使用官方 Python 3.11 轻量级镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量，防止 Python 生成 pyc 文件和缓冲输出
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装系统依赖（如需编译某些 Python 包）
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     gcc \
#     && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# 复制项目代码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
