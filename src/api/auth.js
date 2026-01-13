const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * 发送短信验证码
 * @param {string} phoneNumber - 手机号
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendVerifyCode = async (phoneNumber) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone_number: phoneNumber }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.detail || '发送失败，请稍后重试'
            };
        }

        return data;
    } catch (error) {
        console.error('Send code error:', error);
        return {
            success: false,
            message: '网络错误，请检查后端服务是否启动'
        };
    }
};

/**
 * 校验短信验证码
 * @param {string} phoneNumber - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{success: boolean, message: string, user?: object}>}
 */
export const verifyCode = async (phoneNumber, code) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone_number: phoneNumber,
                code: code
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.detail || '验证失败'
            };
        }

        return data;
    } catch (error) {
        console.error('Verify code error:', error);
        return {
            success: false,
            message: '网络错误，请检查后端服务是否启动'
        };
    }
};
