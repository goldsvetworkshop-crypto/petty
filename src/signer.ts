import { type Address, type Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { MemorySandbox } from "./crypto/memory.js";

export interface IEnclaveSigner {
  getAddress(): Promise<Address>;
  signTypedData(params: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<Hex>;
  dispose(): void;
}

export class MemoryGuardedLocalSigner implements IEnclaveSigner {
  private keyBytes: Uint8Array | null;
  private account: PrivateKeyAccount | null;

  constructor(rawPrivateKeyHex: Hex) {
    const clean = rawPrivateKeyHex.startsWith("0x") ? rawPrivateKeyHex.slice(2) : rawPrivateKeyHex;
    this.keyBytes = new Uint8Array(Buffer.from(clean, "hex"));
    this.account = privateKeyToAccount(`0x${Buffer.from(this.keyBytes).toString("hex")}`);
  }

  public async getAddress(): Promise<Address> {
    if (!this.account) throw new Error("[Petty Signer] Instance disposed.");
    return this.account.address;
  }

  public async signTypedData(params: any): Promise<Hex> {
    if (!this.account) throw new Error("[Petty Signer] Instance disposed.");
    return await this.account.signTypedData(params);
  }

  public dispose(): void {
    if (this.keyBytes) {
      MemorySandbox.wipe(this.keyBytes);
      this.keyBytes = null;
    }
    this.account = null;
  }
}