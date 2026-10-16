import axios, { type AxiosInstance } from "axios";
import { SsrSecurityError } from "../errors.js";

const FORBIDDEN_IPS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/
];

export function createUniversalHttpClient(allowLocalhost = false): AxiosInstance {
  const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

  if (isNode && !allowLocalhost) {
    try {
      const http = require("node:http");
      const https = require("node:https");
      const dns = require("node:dns");

      const safeLookup = (hostname: string, options: any, callback: (err: any, address: string, family: number) => void) => {
        dns.lookup(hostname, options, (err: any, address: string, family: number) => {
          if (err) return callback(err, address, family);
          if (FORBIDDEN_IPS.some((re) => re.test(address))) {
            return callback(
              new SsrSecurityError(`SSRF Blocked: Host '${hostname}' resolved to private IP: ${address}`),
              "",
              family
            );
          }
          callback(null, address, family);
        });
      };

      return axios.create({
        httpAgent: new http.Agent({ lookup: safeLookup }),
        httpsAgent: new https.Agent({ lookup: safeLookup }),
        maxRedirects: 0,
        timeout: 10000,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 402
      });
    } catch {
      // Fallback
    }
  }

  return axios.create({
    maxRedirects: 0,
    timeout: 10000,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 402
  });
}