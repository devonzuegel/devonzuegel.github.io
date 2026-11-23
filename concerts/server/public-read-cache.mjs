// Cache only replaceable public catalog metadata, never accounts or shared lists.
export class PublicReadCache {
  constructor({ttl=300000,maxBytes=32*1024*1024,now=Date.now}={}) { Object.assign(this,{ttl,maxBytes,now});this.items=new Map();this.bytes=0; }
  allows(key) { return key==='feed' || /^(tm|artist-context|venue-media|media|musicbrainz|musicbrainz-place|venue-geocode|event-detail):/.test(key); }
  delete(key) { const old=this.items.get(key);if(old)this.bytes-=old.size;this.items.delete(key); }
  get(key) { const item=this.items.get(key);if(!item)return undefined;if(item.expires<=this.now()){this.delete(key);return undefined;}return JSON.parse(item.raw); }
  set(key,value) { if(!this.allows(key)||value==null)return;const raw=JSON.stringify(value),size=Buffer.byteLength(raw);this.delete(key);if(size>this.maxBytes)return;while(this.items.size && this.bytes+size>this.maxBytes)this.delete(this.items.keys().next().value);this.items.set(key,{raw,size,expires:this.now()+this.ttl});this.bytes+=size; }
}
