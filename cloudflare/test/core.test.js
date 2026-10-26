import test from "node:test";
import assert from "node:assert/strict";
import {validateAlias,validateDestination} from "../src/core.js";
test("accepts safe aliases",()=>assert.equal(validateAlias("claimmp"),"claimmp"));
test("rejects reserved and invalid names",()=>{for(const name of ["api","r","UPPER","ab","trailing-","a/b"])assert.throws(()=>validateAlias(name));});
test("allows public HTTPS destinations",()=>assert.equal(validateDestination("https://example.org/page"),"https://example.org/page"));
test("rejects private and insecure destinations",()=>{for(const url of ["http://example.org","https://localhost/","https://127.0.0.1","javascript:alert(1)","https://site.local","https://user:pass@example.org"])assert.throws(()=>validateDestination(url));});
