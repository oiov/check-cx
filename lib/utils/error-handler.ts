/**
 * 错误处理工具
 */

/**
 * 敏感字段的正则匹配模式
 */
const SENSITIVE_PATTERNS =
  /api[_-]?key|secret|token|password|authorization|bearer|credential/i;

/**
 * 对可能包含敏感信息的值进行脱敏处理
 * @param value 待脱敏的值
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // 短字符串直接返回
    if (value.length <= 8) {
      return value;
    }
    // 长字符串部分隐藏（保留前4位和后4位）
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  }
  return value;
}

/**
 * 递归过滤错误对象中的敏感信息
 * @param error 错误对象或数据
 */
function sanitizeError(error: unknown): unknown {
  // 处理 null 和 undefined
  if (error === null || error === undefined) {
    return error;
  }

  // 处理原始类型
  if (typeof error !== "object") {
    return error;
  }

  // 处理数组
  if (Array.isArray(error)) {
    return error.map((item) => sanitizeError(item));
  }

  // 处理 Error 对象
  if (error instanceof Error) {
    const sanitized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };
    if (error.stack) {
      sanitized.stack = error.stack;
    }
    // 递归处理 Error 对象的其他属性
    const errorObj = error as unknown as Record<string, unknown>;
    for (const key in error) {
      if (
        Object.prototype.hasOwnProperty.call(error, key) &&
        !["name", "message", "stack"].includes(key)
      ) {
        const value = errorObj[key];
        if (SENSITIVE_PATTERNS.test(key)) {
          sanitized[key] = sanitizeValue(value);
        } else {
          sanitized[key] = sanitizeError(value);
        }
      }
    }
    return sanitized;
  }

  // 处理普通对象
  const sanitized: Record<string, unknown> = {};
  for (const key in error) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      const value = (error as Record<string, unknown>)[key];
      // 匹配敏感字段名称
      if (SENSITIVE_PATTERNS.test(key)) {
        sanitized[key] = sanitizeValue(value);
      } else {
        sanitized[key] = sanitizeError(value);
      }
    }
  }
  return sanitized;
}

function stringifySanitizedError(error: unknown): string {
  const sanitized = sanitizeError(error);

  if (typeof sanitized === "string") {
    return sanitized;
  }

  try {
    return JSON.stringify(sanitized);
  } catch {
    return String(sanitized);
  }
}

/** logMessage 最大长度，超出部分截断 */
const MAX_LOG_MESSAGE_LENGTH = 500;

/**
 * 统一的错误日志记录
 * @param context 错误上下文
 * @param error 错误对象
 */
export function logError(context: string, error: unknown): void {
  console.error(`[check-cx] ${context}:`, sanitizeError(error));
}

/**
 * AI SDK API 调用错误类型
 * 用于类型安全地访问 AI_APICallError 的属性
 */
interface AIAPICallError extends Error {
  statusCode?: number;
  responseBody?: string;
  url?: string;
  /** AI SDK RetryError 持有的最后一次失败 */
  lastError?: unknown;
  /** AI SDK RetryError 累积的全部失败 */
  errors?: unknown[];
  cause?: unknown;
}

/**
 * 判断是否为超时 / Abort 类错误
 */
function isTimeoutError(error: Error): boolean {
  if (error.name === "AbortError") {
    return true;
  }
  return /request was aborted|timeout/i.test(error.message || "");
}

/**
 * 从 AI SDK RetryError / 包装错误中取出最内层真实错误
 *
 * streamText 默认会重试，最终抛出 AI_RetryError，真正的 APICallError
 * 在 lastError / errors 末尾；不 unwrap 时 message 会变成：
 * "Failed after 3 attempts. Last error: AI_APICallError: Service Unavailable"
 */
function unwrapRootError(error: unknown, depth = 0): unknown {
  if (depth > 5 || error == null || typeof error !== "object") {
    return error;
  }

  const candidate = error as AIAPICallError;

  if (candidate.lastError != null) {
    return unwrapRootError(candidate.lastError, depth + 1);
  }

  if (Array.isArray(candidate.errors) && candidate.errors.length > 0) {
    return unwrapRootError(candidate.errors[candidate.errors.length - 1], depth + 1);
  }

  if (candidate.cause != null && candidate.cause !== error) {
    // 仅当外层是重试包装文案时才继续深入 cause
    if (
      typeof candidate.message === "string" &&
      /Failed after \d+ attempts/i.test(candidate.message)
    ) {
      return unwrapRootError(candidate.cause, depth + 1);
    }
  }

  return error;
}

/**
 * 从 responseBody 中提取错误消息
 * 支持 SSE 格式和 JSON 格式
 */
function extractErrorFromResponseBody(responseBody: string): string | null {
  // 尝试从 SSE 格式中提取 (event:error\ndata:{...})
  const sseMatch = responseBody.match(/data:\s*(\{.*\})/);
  if (sseMatch) {
    try {
      const data = JSON.parse(sseMatch[1]);
      if (data.message) return data.message;
      if (data.error?.message) return data.error.message;
    } catch {
      // 解析失败，继续尝试其他方式
    }
  }

  // 尝试直接解析为 JSON
  try {
    const data = JSON.parse(responseBody);
    if (data.message) return data.message;
    if (data.error?.message) return data.error.message;
  } catch {
    // 不是 JSON，返回原始内容的前 100 字符
    if (responseBody.length > 0) {
      return responseBody.slice(0, 100);
    }
  }

  return null;
}

/**
 * 从单层错误对象提取消息（不做 RetryError unwrap）
 */
function getErrorMessageFromSingle(error: Error): string {
  if (isTimeoutError(error)) {
    return "请求超时";
  }

  const apiError = error as AIAPICallError;

  // 尝试从 responseBody 中提取更有意义的错误消息
  if (apiError.responseBody) {
    const extracted = extractErrorFromResponseBody(apiError.responseBody);
    if (extracted) {
      const statusPrefix = apiError.statusCode ? `[${apiError.statusCode}] ` : "";
      return `${statusPrefix}${extracted}`;
    }
  }

  // 如果有状态码，添加到消息前
  if (apiError.statusCode) {
    return `[${apiError.statusCode}] ${error.message}`;
  }

  return error.message;
}

/**
 * 安全地提取错误消息
 * 支持从 AI SDK 的 AI_APICallError / AI_RetryError 中提取详细信息
 * @param error 错误对象
 */
export function getErrorMessage(error: unknown): string {
  const root = unwrapRootError(error);

  if (root instanceof Error) {
    return getErrorMessageFromSingle(root);
  }
  if (typeof root === "string") {
    return root;
  }
  if (error instanceof Error) {
    // unwrap 失败时回退外层，再尝试从包装文案里抠 Last error
    return toDisplayErrorMessage(error.message) || error.message;
  }
  if (typeof error === "string") {
    return toDisplayErrorMessage(error) || error;
  }
  return "未知错误";
}

/**
 * 生成简洁的单行错误详情，用于后台日志记录（logMessage）
 *
 * 优先取 API 响应中返回的错误信息（responseBody 里的 message），
 * 格式：`ErrorName: [statusCode] message`（截断至 500 字符）。
 * 不包含 stack trace 和完整 responseBody，避免日志冗长
 */
export function getSanitizedErrorDetail(error: unknown): string {
  const root = unwrapRootError(error);
  const detail =
    root instanceof Error
      ? `${root.name}: ${getErrorMessageFromSingle(root)}`
      : error instanceof Error
        ? `${error.name}: ${getErrorMessage(error)}`
        : stringifySanitizedError(error);

  return detail.length > MAX_LOG_MESSAGE_LENGTH
    ? `${detail.slice(0, MAX_LOG_MESSAGE_LENGTH)}…`
    : detail;
}

/**
 * 将检查结果 / 历史记录中的 message 收成时间线可读文案
 *
 * 例：
 * - `Failed after 3 attempts. Last error: AI_APICallError: [403] Forbidden`
 *   → `[403] Forbidden`
 * - `AI_APICallError: [403] Forbidden` → `[403] Forbidden`
 * - `验证通过 (120ms)` → 原样返回
 */
export function toDisplayErrorMessage(message: string | null | undefined): string {
  if (!message) {
    return "";
  }

  let text = message.trim();
  if (!text) {
    return "";
  }

  // Failed after N attempts. Last error: ...
  const lastErrorMatch = text.match(/Last error:\s*(.+)$/i);
  if (lastErrorMatch?.[1]) {
    text = lastErrorMatch[1].trim();
  } else {
    // Failed after N attempts with non-retryable error: '...'
    const nonRetryMatch = text.match(/non-retryable error:\s*'(.+)'\s*$/i);
    if (nonRetryMatch?.[1]) {
      text = nonRetryMatch[1].trim();
    }
  }

  // 去掉 AI_APICallError: / Error: 等前缀（可连续剥多层）
  for (let i = 0; i < 3; i += 1) {
    const stripped = text.replace(/^[A-Za-z][A-Za-z0-9_]*Error:\s*/i, "").trim();
    if (stripped === text) {
      break;
    }
    text = stripped;
  }

  // 若仍含 [status] 片段，优先取从第一个 [ddd] 起的内容
  const statusMatch = text.match(/(\[\d{3}]\s*.+)$/);
  if (statusMatch?.[1]) {
    return statusMatch[1].trim();
  }

  return text;
}
