import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type BinaryLike,
  type ScryptOptions
} from "node:crypto";

export type PasswordHashOptions = {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
};

export async function hashPassword(
  password: string,
  options: PasswordHashOptions
): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const cost = scryptCost(options.timeCost);
  const key = (await scryptAsync(password, salt, 64, {
    N: cost,
    r: 8,
    p: options.parallelism,
    maxmem: Math.max(options.memoryCost * 1024 * 2, 64 * 1024 * 1024)
  })) as Buffer;

  return ["scrypt", cost, 8, options.parallelism, salt, key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, costText, blockSizeText, parallelismText, salt, expectedText] =
    storedHash.split("$");

  if (algorithm !== "scrypt" || !costText || !blockSizeText || !parallelismText || !salt || !expectedText) {
    return false;
  }

  const expected = Buffer.from(expectedText, "base64url");
  const actual = (await scryptAsync(password, salt, expected.length, {
    N: Number(costText),
    r: Number(blockSizeText),
    p: Number(parallelismText),
    maxmem: 128 * 1024 * 1024
  })) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function scryptCost(timeCost: number): number {
  return 2 ** Math.min(18, Math.max(14, 13 + timeCost));
}

function scryptAsync(
  password: BinaryLike,
  salt: BinaryLike,
  keyLength: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}
