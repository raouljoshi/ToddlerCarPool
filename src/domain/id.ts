export type IdFactory = () => string;

export const createCryptoId: IdFactory = () => crypto.randomUUID();
