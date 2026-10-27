import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("QR buttons show a popup; only Download QR saves a file",async()=>{
  const originalDocument=globalThis.document;
  const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
  const elements=new Map(),saved=[],released=[];
  class Element {
    constructor(){this.handlers={};this.hidden=false;this.disabled=false;this.open=false;this.textContent="";}
    addEventListener(type,callback){this.handlers[type]=callback}
    click(){this.handlers.click?.({target:this})}
    showModal(){this.open=true}
    close(){this.open=false;this.handlers.close?.()}
    removeAttribute(key){delete this[key]}
    remove(){}
  }
  const get=id=>elements.get(id)??(elements.set(id,new Element()),elements.get(id));
  globalThis.document={
    getElementById:get,
    createElement:()=>Object.assign(new Element(),{
      click(){saved.push({href:this.href,name:this.download})}
    }),
    body:{append(){}}
  };
  URL.createObjectURL=()=> "blob:preview-"+Math.random();
  URL.revokeObjectURL=url=>released.push(url);
  try {
    const src=await readFile(new URL("../public/qr-preview.js",import.meta.url),"utf8");
    const {openQrPreview}=await import("data:text/javascript;base64,"+Buffer.from(src).toString("base64"));
    const response=()=>new Response('<svg xmlns="http://www.w3.org/2000/svg"/>',{headers:{"content-type":"image/svg+xml"}});
    await openQrPreview({
      fetchQr:async()=>response(),shortUrl:"https://zrain-links.web.app/example",
      fileName:"zrain-links-example.svg"
    });
    assert.equal(get("qr-dialog").open,true);
    assert.equal(get("qr-dialog-image").hidden,false);
    assert.equal(get("qr-dialog-download").disabled,false);
    assert.equal(saved.length,0,"preview must not start an automatic download");
    get("qr-dialog-download").click();
    assert.equal(saved.length,1);
    assert.equal(saved[0].name,"zrain-links-example.svg");
    get("qr-dialog-close").click();
    assert.equal(get("qr-dialog").open,false);
    assert.equal(released.length,1,"object URL must be released on close");

    await openQrPreview({
      fetchQr:async()=>{throw new Error("Network error")},
      shortUrl:"https://zrain-links.web.app/another",fileName:"another.svg"
    });
    assert.equal(get("qr-dialog-download").disabled,true);
    assert.match(get("qr-dialog-error").textContent,/Network error/);
    assert.equal(saved.length,1,"failure cannot download previous QR");
    get("qr-dialog").close();

    let finish;
    const pending=openQrPreview({
      fetchQr:()=>new Promise(resolve=>finish=resolve),
      shortUrl:"https://zrain-links.web.app/late",fileName:"late.svg"
    });
    get("qr-dialog").close();
    finish(response());
    await pending;
    assert.equal(get("qr-dialog-download").disabled,true);
    assert.equal(saved.length,1);
  }finally{
    globalThis.document=originalDocument;
    URL.createObjectURL=oldCreate;
    URL.revokeObjectURL=oldRevoke;
  }
});

test("both link types use the shared QR dialog without auto download",async()=>{
  const read=path=>readFile(new URL(path,import.meta.url),"utf8");
  const [html,direct,visits,css]=await Promise.all([
    read("../public/index.html"),read("../public/app.js"),read("../public/visits-ui.js"),
    read("../public/qr-preview.css")
  ]);
  for(const id of ["qr-dialog","qr-dialog-image","qr-dialog-download","qr-dialog-close","qr-dialog-dismiss",
    "result-qr","visits-qr-result"])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(direct,/openQrPreview\(/);
  assert.match(visits,/openQrPreview\(/);
  assert.doesNotMatch(direct,/anchor\.download = "zrain-links-"/);
  assert.doesNotMatch(visits,/a\.download="zrain-visits-"/);
  assert.match(html,/qr-preview\.css/);
  assert.match(css,/\.qr-dialog::backdrop/);
});
