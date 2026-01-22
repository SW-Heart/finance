/**
 * AI 财务咨询 API
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api') + '/ai';

/**
 * 与 AI 财务顾问对话（流式输出）
 * @param {string} userId - 用户ID
 * @param {Array<{role: string, content: string}>} messages - 对话历史
 * @param {function} onChunk - 接收每个文本片段的回调
 * @param {function} onDone - 完成时的回调
 * @param {function} onError - 错误时的回调
 * @returns {Promise<void>}
 */
export const chatWithAdvisorStream = async (userId, messages, onChunk, onDone, onError) => {
    let isDone = false;

    try {
        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                messages: messages
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`AI 咨询服务异常: ${error}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        isDone = true;
                        onDone?.();
                        return;
                    }
                    if (data.startsWith('[ERROR]')) {
                        isDone = true;
                        try {
                            const errorPayload = JSON.parse(data.slice(7)); // Remove "[ERROR] "
                            onError?.(new Error(errorPayload.error || 'Unknown error'));
                        } catch (e) {
                            onError?.(new Error(data.slice(8)));
                        }
                        return;
                    }

                    try {
                        const payload = JSON.parse(data);
                        if (payload.content) {
                            onChunk?.(payload.content);
                        }
                    } catch (e) {
                        console.error('Failed to parse SSE data:', e);
                    }
                }
            }
        }

        // 只有在没有收到 [DONE] 消息时才调用 onDone
        if (!isDone) {
            onDone?.();
        }
    } catch (error) {
        onError?.(error);
    }
};

/**
 * 与 AI 财务顾问对话（非流式，保留备用）
 * @param {string} userId - 用户ID
 * @param {Array<{role: string, content: string}>} messages - 对话历史
 * @returns {Promise<{reply: string}>}
 */
export const chatWithAdvisor = async (userId, messages) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            messages: messages
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI 咨询服务异常: ${error}`);
    }

    return response.json();
};
