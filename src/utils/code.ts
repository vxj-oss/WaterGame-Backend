const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
