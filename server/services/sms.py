# -*- coding: utf-8 -*-
"""
阿里云短信验证码服务
使用云通信号码认证服务 (dypnsapi) 发送验证码
"""
import os
import random
import string
from alibabacloud_dypnsapi20170525.client import Client as Dypnsapi20170525Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_dypnsapi20170525 import models as dypnsapi_models
from alibabacloud_tea_util import models as util_models


def create_client() -> Dypnsapi20170525Client:
    """使用 AccessKey 初始化客户端"""
    config = open_api_models.Config(
        access_key_id=os.getenv("ALIYUN_ACCESS_KEY_ID"),
        access_key_secret=os.getenv("ALIYUN_ACCESS_KEY_SECRET")
    )
    config.endpoint = "dypnsapi.aliyuncs.com"
    return Dypnsapi20170525Client(config)


def generate_code(length: int = 6) -> str:
    """生成随机数字验证码"""
    return ''.join(random.choices(string.digits, k=length))


def send_verification_code(phone: str) -> dict:
    """
    发送短信验证码（阿里云自动生成验证码）
    
    Args:
        phone: 手机号
        
    Returns:
        dict: 包含 success 和 message
    """
    try:
        client = create_client()
        
        # 从环境变量读取配置
        scheme_name = os.getenv("SMS_SCHEME_NAME", "FINANCE")
        sign_name = os.getenv("SMS_SIGN_NAME", "速通互联验证码")
        template_code = os.getenv("SMS_TEMPLATE_CODE", "100001")
        
        # 使用 ##code## 占位符让阿里云自动生成验证码
        request = dypnsapi_models.SendSmsVerifyCodeRequest(
            scheme_name=scheme_name,
            phone_number=phone,
            sign_name=sign_name,
            template_code=template_code,
            template_param='{"code":"##code##","min":"5"}',
            code_length=6,  # 验证码长度
            valid_time=300  # 有效期 5 分钟
        )
        
        response = client.send_sms_verify_code_with_options(
            request, 
            util_models.RuntimeOptions()
        )
        
        print(f"SendSmsVerifyCode Response: {response.body}")
        
        if response.body.code == "OK":
            return {"success": True, "message": "验证码已发送"}
        else:
            return {"success": False, "message": response.body.message or "发送失败"}
            
    except Exception as e:
        error_msg = str(e)
        print(f"SMS Error: {error_msg}")
        return {"success": False, "message": f"短信发送失败: {error_msg}"}


def verify_code(phone: str, code: str) -> dict:
    """
    校验短信验证码
    
    Args:
        phone: 手机号
        code: 验证码
        
    Returns:
        dict: 包含 success 和 message
    """
    try:
        client = create_client()
        
        scheme_name = os.getenv("SMS_SCHEME_NAME", "FINANCE")
        
        request = dypnsapi_models.CheckSmsVerifyCodeRequest(
            scheme_name=scheme_name,
            phone_number=phone,
            verify_code=code
        )
        
        response = client.check_sms_verify_code_with_options(
            request,
            util_models.RuntimeOptions()
        )
        
        print(f"CheckSmsVerifyCode Response: {response.body}")
        print(f"CheckSmsVerifyCode Response Code: {response.body.code}")
        
        if response.body.code == "OK":
            # 检查验证结果
            print(f"Verify Result Model: {response.body.model}")
            if response.body.model and response.body.model.verify_result == "PASS":
                return {"success": True, "message": "验证成功"}
            else:
                verify_result = response.body.model.verify_result if response.body.model else "No Model"
                return {"success": False, "message": f"验证码错误或已过期 (result: {verify_result})"}
        else:
            return {"success": False, "message": response.body.message or "验证失败"}
            
    except Exception as e:
        error_msg = str(e)
        print(f"Verify Error: {error_msg}")
        return {"success": False, "message": f"验证失败: {error_msg}"}
