import { message } from 'antd';

const MessageError = (content: string, key = 'error_str') =>
  message.error({ key, content });

export { MessageError };
