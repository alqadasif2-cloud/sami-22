var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/jszip/dist/jszip.min.js
var require_jszip_min = __commonJS({
  "node_modules/jszip/dist/jszip.min.js"(exports, module) {
    !(function(e) {
      if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();
      else if ("function" == typeof define && define.amd) define([], e);
      else {
        ("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this).JSZip = e();
      }
    })(function() {
      return (function s(a, o, h) {
        function u(r, e2) {
          if (!o[r]) {
            if (!a[r]) {
              var t = "function" == typeof __require && __require;
              if (!e2 && t) return t(r, true);
              if (l) return l(r, true);
              var n = new Error("Cannot find module '" + r + "'");
              throw n.code = "MODULE_NOT_FOUND", n;
            }
            var i = o[r] = { exports: {} };
            a[r][0].call(i.exports, function(e3) {
              var t2 = a[r][1][e3];
              return u(t2 || e3);
            }, i, i.exports, s, a, o, h);
          }
          return o[r].exports;
        }
        for (var l = "function" == typeof __require && __require, e = 0; e < h.length; e++) u(h[e]);
        return u;
      })({ 1: [function(e, t, r) {
        "use strict";
        var d = e("./utils"), c = e("./support"), p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        r.encode = function(e2) {
          for (var t2, r2, n, i, s, a, o, h = [], u = 0, l = e2.length, f = l, c2 = "string" !== d.getTypeOf(e2); u < e2.length; ) f = l - u, n = c2 ? (t2 = e2[u++], r2 = u < l ? e2[u++] : 0, u < l ? e2[u++] : 0) : (t2 = e2.charCodeAt(u++), r2 = u < l ? e2.charCodeAt(u++) : 0, u < l ? e2.charCodeAt(u++) : 0), i = t2 >> 2, s = (3 & t2) << 4 | r2 >> 4, a = 1 < f ? (15 & r2) << 2 | n >> 6 : 64, o = 2 < f ? 63 & n : 64, h.push(p.charAt(i) + p.charAt(s) + p.charAt(a) + p.charAt(o));
          return h.join("");
        }, r.decode = function(e2) {
          var t2, r2, n, i, s, a, o = 0, h = 0, u = "data:";
          if (e2.substr(0, u.length) === u) throw new Error("Invalid base64 input, it looks like a data url.");
          var l, f = 3 * (e2 = e2.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (e2.charAt(e2.length - 1) === p.charAt(64) && f--, e2.charAt(e2.length - 2) === p.charAt(64) && f--, f % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (l = c.uint8array ? new Uint8Array(0 | f) : new Array(0 | f); o < e2.length; ) t2 = p.indexOf(e2.charAt(o++)) << 2 | (i = p.indexOf(e2.charAt(o++))) >> 4, r2 = (15 & i) << 4 | (s = p.indexOf(e2.charAt(o++))) >> 2, n = (3 & s) << 6 | (a = p.indexOf(e2.charAt(o++))), l[h++] = t2, 64 !== s && (l[h++] = r2), 64 !== a && (l[h++] = n);
          return l;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(e, t, r) {
        "use strict";
        var n = e("./external"), i = e("./stream/DataWorker"), s = e("./stream/Crc32Probe"), a = e("./stream/DataLengthProbe");
        function o(e2, t2, r2, n2, i2) {
          this.compressedSize = e2, this.uncompressedSize = t2, this.crc32 = r2, this.compression = n2, this.compressedContent = i2;
        }
        o.prototype = { getContentWorker: function() {
          var e2 = new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")), t2 = this;
          return e2.on("end", function() {
            if (this.streamInfo.data_length !== t2.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), e2;
        }, getCompressedWorker: function() {
          return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, o.createWorkerFrom = function(e2, t2, r2) {
          return e2.pipe(new s()).pipe(new a("uncompressedSize")).pipe(t2.compressWorker(r2)).pipe(new a("compressedSize")).withStreamInfo("compression", t2);
        }, t.exports = o;
      }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(e, t, r) {
        "use strict";
        var n = e("./stream/GenericWorker");
        r.STORE = { magic: "\0\0", compressWorker: function() {
          return new n("STORE compression");
        }, uncompressWorker: function() {
          return new n("STORE decompression");
        } }, r.DEFLATE = e("./flate");
      }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(e, t, r) {
        "use strict";
        var n = e("./utils");
        var o = (function() {
          for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
            e2 = r2;
            for (var n2 = 0; n2 < 8; n2++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
            t2[r2] = e2;
          }
          return t2;
        })();
        t.exports = function(e2, t2) {
          return void 0 !== e2 && e2.length ? "string" !== n.getTypeOf(e2) ? (function(e3, t3, r2, n2) {
            var i = o, s = n2 + r2;
            e3 ^= -1;
            for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3[a])];
            return -1 ^ e3;
          })(0 | t2, e2, e2.length, 0) : (function(e3, t3, r2, n2) {
            var i = o, s = n2 + r2;
            e3 ^= -1;
            for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3.charCodeAt(a))];
            return -1 ^ e3;
          })(0 | t2, e2, e2.length, 0) : 0;
        };
      }, { "./utils": 32 }], 5: [function(e, t, r) {
        "use strict";
        r.base64 = false, r.binary = false, r.dir = false, r.createFolders = true, r.date = null, r.compression = null, r.compressionOptions = null, r.comment = null, r.unixPermissions = null, r.dosPermissions = null;
      }, {}], 6: [function(e, t, r) {
        "use strict";
        var n = null;
        n = "undefined" != typeof Promise ? Promise : e("lie"), t.exports = { Promise: n };
      }, { lie: 37 }], 7: [function(e, t, r) {
        "use strict";
        var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Uint32Array, i = e("pako"), s = e("./utils"), a = e("./stream/GenericWorker"), o = n ? "uint8array" : "array";
        function h(e2, t2) {
          a.call(this, "FlateWorker/" + e2), this._pako = null, this._pakoAction = e2, this._pakoOptions = t2, this.meta = {};
        }
        r.magic = "\b\0", s.inherits(h, a), h.prototype.processChunk = function(e2) {
          this.meta = e2.meta, null === this._pako && this._createPako(), this._pako.push(s.transformTo(o, e2.data), false);
        }, h.prototype.flush = function() {
          a.prototype.flush.call(this), null === this._pako && this._createPako(), this._pako.push([], true);
        }, h.prototype.cleanUp = function() {
          a.prototype.cleanUp.call(this), this._pako = null;
        }, h.prototype._createPako = function() {
          this._pako = new i[this._pakoAction]({ raw: true, level: this._pakoOptions.level || -1 });
          var t2 = this;
          this._pako.onData = function(e2) {
            t2.push({ data: e2, meta: t2.meta });
          };
        }, r.compressWorker = function(e2) {
          return new h("Deflate", e2);
        }, r.uncompressWorker = function() {
          return new h("Inflate", {});
        };
      }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, t, r) {
        "use strict";
        function A(e2, t2) {
          var r2, n2 = "";
          for (r2 = 0; r2 < t2; r2++) n2 += String.fromCharCode(255 & e2), e2 >>>= 8;
          return n2;
        }
        function n(e2, t2, r2, n2, i2, s2) {
          var a, o, h = e2.file, u = e2.compression, l = s2 !== O.utf8encode, f = I.transformTo("string", s2(h.name)), c = I.transformTo("string", O.utf8encode(h.name)), d = h.comment, p = I.transformTo("string", s2(d)), m = I.transformTo("string", O.utf8encode(d)), _ = c.length !== h.name.length, g = m.length !== d.length, b = "", v = "", y = "", w = h.dir, k = h.date, x = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          t2 && !r2 || (x.crc32 = e2.crc32, x.compressedSize = e2.compressedSize, x.uncompressedSize = e2.uncompressedSize);
          var S = 0;
          t2 && (S |= 8), l || !_ && !g || (S |= 2048);
          var z = 0, C = 0;
          w && (z |= 16), "UNIX" === i2 ? (C = 798, z |= (function(e3, t3) {
            var r3 = e3;
            return e3 || (r3 = t3 ? 16893 : 33204), (65535 & r3) << 16;
          })(h.unixPermissions, w)) : (C = 20, z |= (function(e3) {
            return 63 & (e3 || 0);
          })(h.dosPermissions)), a = k.getUTCHours(), a <<= 6, a |= k.getUTCMinutes(), a <<= 5, a |= k.getUTCSeconds() / 2, o = k.getUTCFullYear() - 1980, o <<= 4, o |= k.getUTCMonth() + 1, o <<= 5, o |= k.getUTCDate(), _ && (v = A(1, 1) + A(B(f), 4) + c, b += "up" + A(v.length, 2) + v), g && (y = A(1, 1) + A(B(p), 4) + m, b += "uc" + A(y.length, 2) + y);
          var E = "";
          return E += "\n\0", E += A(S, 2), E += u.magic, E += A(a, 2), E += A(o, 2), E += A(x.crc32, 4), E += A(x.compressedSize, 4), E += A(x.uncompressedSize, 4), E += A(f.length, 2), E += A(b.length, 2), { fileRecord: R.LOCAL_FILE_HEADER + E + f + b, dirRecord: R.CENTRAL_FILE_HEADER + A(C, 2) + E + A(p.length, 2) + "\0\0\0\0" + A(z, 4) + A(n2, 4) + f + b + p };
        }
        var I = e("../utils"), i = e("../stream/GenericWorker"), O = e("../utf8"), B = e("../crc32"), R = e("../signature");
        function s(e2, t2, r2, n2) {
          i.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t2, this.zipPlatform = r2, this.encodeFileName = n2, this.streamFiles = e2, this.accumulate = false, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        I.inherits(s, i), s.prototype.push = function(e2) {
          var t2 = e2.meta.percent || 0, r2 = this.entriesCount, n2 = this._sources.length;
          this.accumulate ? this.contentBuffer.push(e2) : (this.bytesWritten += e2.data.length, i.prototype.push.call(this, { data: e2.data, meta: { currentFile: this.currentFile, percent: r2 ? (t2 + 100 * (r2 - n2 - 1)) / r2 : 100 } }));
        }, s.prototype.openedSource = function(e2) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = e2.file.name;
          var t2 = this.streamFiles && !e2.file.dir;
          if (t2) {
            var r2 = n(e2, t2, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: r2.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = true;
        }, s.prototype.closedSource = function(e2) {
          this.accumulate = false;
          var t2 = this.streamFiles && !e2.file.dir, r2 = n(e2, t2, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(r2.dirRecord), t2) this.push({ data: (function(e3) {
            return R.DATA_DESCRIPTOR + A(e3.crc32, 4) + A(e3.compressedSize, 4) + A(e3.uncompressedSize, 4);
          })(e2), meta: { percent: 100 } });
          else for (this.push({ data: r2.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, s.prototype.flush = function() {
          for (var e2 = this.bytesWritten, t2 = 0; t2 < this.dirRecords.length; t2++) this.push({ data: this.dirRecords[t2], meta: { percent: 100 } });
          var r2 = this.bytesWritten - e2, n2 = (function(e3, t3, r3, n3, i2) {
            var s2 = I.transformTo("string", i2(n3));
            return R.CENTRAL_DIRECTORY_END + "\0\0\0\0" + A(e3, 2) + A(e3, 2) + A(t3, 4) + A(r3, 4) + A(s2.length, 2) + s2;
          })(this.dirRecords.length, r2, e2, this.zipComment, this.encodeFileName);
          this.push({ data: n2, meta: { percent: 100 } });
        }, s.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, s.prototype.registerPrevious = function(e2) {
          this._sources.push(e2);
          var t2 = this;
          return e2.on("data", function(e3) {
            t2.processChunk(e3);
          }), e2.on("end", function() {
            t2.closedSource(t2.previous.streamInfo), t2._sources.length ? t2.prepareNextSource() : t2.end();
          }), e2.on("error", function(e3) {
            t2.error(e3);
          }), this;
        }, s.prototype.resume = function() {
          return !!i.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), true) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), true));
        }, s.prototype.error = function(e2) {
          var t2 = this._sources;
          if (!i.prototype.error.call(this, e2)) return false;
          for (var r2 = 0; r2 < t2.length; r2++) try {
            t2[r2].error(e2);
          } catch (e3) {
          }
          return true;
        }, s.prototype.lock = function() {
          i.prototype.lock.call(this);
          for (var e2 = this._sources, t2 = 0; t2 < e2.length; t2++) e2[t2].lock();
        }, t.exports = s;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, t, r) {
        "use strict";
        var u = e("../compressions"), n = e("./ZipFileWorker");
        r.generateWorker = function(e2, a, t2) {
          var o = new n(a.streamFiles, t2, a.platform, a.encodeFileName), h = 0;
          try {
            e2.forEach(function(e3, t3) {
              h++;
              var r2 = (function(e4, t4) {
                var r3 = e4 || t4, n3 = u[r3];
                if (!n3) throw new Error(r3 + " is not a valid compression method !");
                return n3;
              })(t3.options.compression, a.compression), n2 = t3.options.compressionOptions || a.compressionOptions || {}, i = t3.dir, s = t3.date;
              t3._compressWorker(r2, n2).withStreamInfo("file", { name: e3, dir: i, date: s, comment: t3.comment || "", unixPermissions: t3.unixPermissions, dosPermissions: t3.dosPermissions }).pipe(o);
            }), o.entriesCount = h;
          } catch (e3) {
            o.error(e3);
          }
          return o;
        };
      }, { "../compressions": 3, "./ZipFileWorker": 8 }], 10: [function(e, t, r) {
        "use strict";
        function n() {
          if (!(this instanceof n)) return new n();
          if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
          this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
            var e2 = new n();
            for (var t2 in this) "function" != typeof this[t2] && (e2[t2] = this[t2]);
            return e2;
          };
        }
        (n.prototype = e("./object")).loadAsync = e("./load"), n.support = e("./support"), n.defaults = e("./defaults"), n.version = "3.10.2", n.loadAsync = function(e2, t2) {
          return new n().loadAsync(e2, t2);
        }, n.external = e("./external"), t.exports = n;
      }, { "./defaults": 5, "./external": 6, "./load": 11, "./object": 15, "./support": 30 }], 11: [function(e, t, r) {
        "use strict";
        var u = e("./utils"), i = e("./external"), n = e("./utf8"), s = e("./zipEntries"), a = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
        function f(n2) {
          return new i.Promise(function(e2, t2) {
            var r2 = n2.decompressed.getContentWorker().pipe(new a());
            r2.on("error", function(e3) {
              t2(e3);
            }).on("end", function() {
              r2.streamInfo.crc32 !== n2.decompressed.crc32 ? t2(new Error("Corrupted zip : CRC32 mismatch")) : e2();
            }).resume();
          });
        }
        t.exports = function(e2, o) {
          var h = this;
          return o = u.extend(o || {}, { base64: false, checkCRC32: false, optimizedBinaryString: false, createFolders: false, decodeFileName: n.utf8decode }), l.isNode && l.isStream(e2) ? i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : u.prepareContent("the loaded zip file", e2, true, o.optimizedBinaryString, o.base64).then(function(e3) {
            var t2 = new s(o);
            return t2.load(e3), t2;
          }).then(function(e3) {
            var t2 = [i.Promise.resolve(e3)], r2 = e3.files;
            if (o.checkCRC32) for (var n2 = 0; n2 < r2.length; n2++) t2.push(f(r2[n2]));
            return i.Promise.all(t2);
          }).then(function(e3) {
            for (var t2 = e3.shift(), r2 = t2.files, n2 = 0; n2 < r2.length; n2++) {
              var i2 = r2[n2], s2 = i2.fileNameStr, a2 = u.resolve(i2.fileNameStr);
              h.file(a2, i2.decompressed, { binary: true, optimizedBinaryString: true, date: i2.date, dir: i2.dir, comment: i2.fileCommentStr.length ? i2.fileCommentStr : null, unixPermissions: i2.unixPermissions, dosPermissions: i2.dosPermissions, createFolders: o.createFolders }), i2.dir || (h.file(a2).unsafeOriginalName = s2);
            }
            return t2.zipComment.length && (h.comment = t2.zipComment), h;
          });
        };
      }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("../stream/GenericWorker");
        function s(e2, t2) {
          i.call(this, "Nodejs stream input adapter for " + e2), this._upstreamEnded = false, this._bindStream(t2);
        }
        n.inherits(s, i), s.prototype._bindStream = function(e2) {
          var t2 = this;
          (this._stream = e2).pause(), e2.on("data", function(e3) {
            t2.push({ data: e3, meta: { percent: 0 } });
          }).on("error", function(e3) {
            t2.isPaused ? this.generatedError = e3 : t2.error(e3);
          }).on("end", function() {
            t2.isPaused ? t2._upstreamEnded = true : t2.end();
          });
        }, s.prototype.pause = function() {
          return !!i.prototype.pause.call(this) && (this._stream.pause(), true);
        }, s.prototype.resume = function() {
          return !!i.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), true);
        }, t.exports = s;
      }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(e, t, r) {
        "use strict";
        var i = e("readable-stream").Readable;
        function n(e2, t2, r2) {
          i.call(this, t2), this._helper = e2;
          var n2 = this;
          e2.on("data", function(e3, t3) {
            n2.push(e3) || n2._helper.pause(), r2 && r2(t3);
          }).on("error", function(e3) {
            n2.emit("error", e3);
          }).on("end", function() {
            n2.push(null);
          });
        }
        e("../utils").inherits(n, i), n.prototype._read = function() {
          this._helper.resume();
        }, t.exports = n;
      }, { "../utils": 32, "readable-stream": 16 }], 14: [function(e, t, r) {
        "use strict";
        t.exports = { isNode: "undefined" != typeof Buffer, newBufferFrom: function(e2, t2) {
          if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(e2, t2);
          if ("number" == typeof e2) throw new Error('The "data" argument must not be a number');
          return new Buffer(e2, t2);
        }, allocBuffer: function(e2) {
          if (Buffer.alloc) return Buffer.alloc(e2);
          var t2 = new Buffer(e2);
          return t2.fill(0), t2;
        }, isBuffer: function(e2) {
          return Buffer.isBuffer(e2);
        }, isStream: function(e2) {
          return e2 && "function" == typeof e2.on && "function" == typeof e2.pause && "function" == typeof e2.resume;
        } };
      }, {}], 15: [function(e, t, r) {
        "use strict";
        function s(e2, t2, r2) {
          var n2, i2 = u.getTypeOf(t2), s2 = u.extend(r2 || {}, f);
          s2.date = s2.date || /* @__PURE__ */ new Date(), null !== s2.compression && (s2.compression = s2.compression.toUpperCase()), "string" == typeof s2.unixPermissions && (s2.unixPermissions = parseInt(s2.unixPermissions, 8)), s2.unixPermissions && 16384 & s2.unixPermissions && (s2.dir = true), s2.dosPermissions && 16 & s2.dosPermissions && (s2.dir = true), s2.dir && (e2 = g(e2)), s2.createFolders && (n2 = _(e2)) && b.call(this, n2, true);
          var a2 = "string" === i2 && false === s2.binary && false === s2.base64;
          r2 && void 0 !== r2.binary || (s2.binary = !a2), (t2 instanceof c && 0 === t2.uncompressedSize || s2.dir || !t2 || 0 === t2.length) && (s2.base64 = false, s2.binary = true, t2 = "", s2.compression = "STORE", i2 = "string");
          var o2 = null;
          o2 = t2 instanceof c || t2 instanceof l ? t2 : p.isNode && p.isStream(t2) ? new m(e2, t2) : u.prepareContent(e2, t2, s2.binary, s2.optimizedBinaryString, s2.base64);
          var h2 = new d(e2, o2, s2);
          this.files[e2] = h2;
        }
        var i = e("./utf8"), u = e("./utils"), l = e("./stream/GenericWorker"), a = e("./stream/StreamHelper"), f = e("./defaults"), c = e("./compressedObject"), d = e("./zipObject"), o = e("./generate"), p = e("./nodejsUtils"), m = e("./nodejs/NodejsStreamInputAdapter"), _ = function(e2) {
          "/" === e2.slice(-1) && (e2 = e2.substring(0, e2.length - 1));
          var t2 = e2.lastIndexOf("/");
          return 0 < t2 ? e2.substring(0, t2) : "";
        }, g = function(e2) {
          return "/" !== e2.slice(-1) && (e2 += "/"), e2;
        }, b = function(e2, t2) {
          return t2 = void 0 !== t2 ? t2 : f.createFolders, e2 = g(e2), this.files[e2] || s.call(this, e2, null, { dir: true, createFolders: t2 }), this.files[e2];
        };
        function h(e2) {
          return "[object RegExp]" === Object.prototype.toString.call(e2);
        }
        var n = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(e2) {
          var t2, r2, n2;
          for (t2 in this.files) n2 = this.files[t2], (r2 = t2.slice(this.root.length, t2.length)) && t2.slice(0, this.root.length) === this.root && e2(r2, n2);
        }, filter: function(r2) {
          var n2 = [];
          return this.forEach(function(e2, t2) {
            r2(e2, t2) && n2.push(t2);
          }), n2;
        }, file: function(e2, t2, r2) {
          if (1 !== arguments.length) return e2 = this.root + e2, s.call(this, e2, t2, r2), this;
          if (h(e2)) {
            var n2 = e2;
            return this.filter(function(e3, t3) {
              return !t3.dir && n2.test(e3);
            });
          }
          var i2 = this.files[this.root + e2];
          return i2 && !i2.dir ? i2 : null;
        }, folder: function(r2) {
          if (!r2) return this;
          if (h(r2)) return this.filter(function(e3, t3) {
            return t3.dir && r2.test(e3);
          });
          var e2 = this.root + r2, t2 = b.call(this, e2), n2 = this.clone();
          return n2.root = t2.name, n2;
        }, remove: function(r2) {
          r2 = this.root + r2;
          var e2 = this.files[r2];
          if (e2 || ("/" !== r2.slice(-1) && (r2 += "/"), e2 = this.files[r2]), e2 && !e2.dir) delete this.files[r2];
          else for (var t2 = this.filter(function(e3, t3) {
            return t3.name.slice(0, r2.length) === r2;
          }), n2 = 0; n2 < t2.length; n2++) delete this.files[t2[n2].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(e2) {
          var t2, r2 = {};
          try {
            if ((r2 = u.extend(e2 || {}, { streamFiles: false, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: i.utf8encode })).type = r2.type.toLowerCase(), r2.compression = r2.compression.toUpperCase(), "binarystring" === r2.type && (r2.type = "string"), !r2.type) throw new Error("No output type specified.");
            u.checkSupport(r2.type), "darwin" !== r2.platform && "freebsd" !== r2.platform && "linux" !== r2.platform && "sunos" !== r2.platform || (r2.platform = "UNIX"), "win32" === r2.platform && (r2.platform = "DOS");
            var n2 = r2.comment || this.comment || "";
            t2 = o.generateWorker(this, r2, n2);
          } catch (e3) {
            (t2 = new l("error")).error(e3);
          }
          return new a(t2, r2.type || "string", r2.mimeType);
        }, generateAsync: function(e2, t2) {
          return this.generateInternalStream(e2).accumulate(t2);
        }, generateNodeStream: function(e2, t2) {
          return (e2 = e2 || {}).type || (e2.type = "nodebuffer"), this.generateInternalStream(e2).toNodejsStream(t2);
        } };
        t.exports = n;
      }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(e, t, r) {
        "use strict";
        t.exports = e("stream");
      }, { stream: void 0 }], 17: [function(e, t, r) {
        "use strict";
        var n = e("./DataReader");
        function i(e2) {
          n.call(this, e2);
          for (var t2 = 0; t2 < this.data.length; t2++) e2[t2] = 255 & e2[t2];
        }
        e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
          return this.data[this.zero + e2];
        }, i.prototype.lastIndexOfSignature = function(e2) {
          for (var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.length - 4; 0 <= s; --s) if (this.data[s] === t2 && this.data[s + 1] === r2 && this.data[s + 2] === n2 && this.data[s + 3] === i2) return s - this.zero;
          return -1;
        }, i.prototype.readAndCheckSignature = function(e2) {
          var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.readData(4);
          return t2 === s[0] && r2 === s[1] && n2 === s[2] && i2 === s[3];
        }, i.prototype.readData = function(e2) {
          if (this.checkOffset(e2), 0 === e2) return [];
          var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./DataReader": 18 }], 18: [function(e, t, r) {
        "use strict";
        var n = e("../utils");
        function i(e2) {
          this.data = e2, this.length = e2.length, this.index = 0, this.zero = 0;
        }
        i.prototype = { checkOffset: function(e2) {
          this.checkIndex(this.index + e2);
        }, checkIndex: function(e2) {
          if (this.length < this.zero + e2 || e2 < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + e2 + "). Corrupted zip ?");
        }, setIndex: function(e2) {
          this.checkIndex(e2), this.index = e2;
        }, skip: function(e2) {
          this.setIndex(this.index + e2);
        }, byteAt: function() {
        }, readInt: function(e2) {
          var t2, r2 = 0;
          for (this.checkOffset(e2), t2 = this.index + e2 - 1; t2 >= this.index; t2--) r2 = (r2 << 8) + this.byteAt(t2);
          return this.index += e2, r2;
        }, readString: function(e2) {
          return n.transformTo("string", this.readData(e2));
        }, readData: function() {
        }, lastIndexOfSignature: function() {
        }, readAndCheckSignature: function() {
        }, readDate: function() {
          var e2 = this.readInt(4);
          return new Date(Date.UTC(1980 + (e2 >> 25 & 127), (e2 >> 21 & 15) - 1, e2 >> 16 & 31, e2 >> 11 & 31, e2 >> 5 & 63, (31 & e2) << 1));
        } }, t.exports = i;
      }, { "../utils": 32 }], 19: [function(e, t, r) {
        "use strict";
        var n = e("./Uint8ArrayReader");
        function i(e2) {
          n.call(this, e2);
        }
        e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
          this.checkOffset(e2);
          var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./Uint8ArrayReader": 21 }], 20: [function(e, t, r) {
        "use strict";
        var n = e("./DataReader");
        function i(e2) {
          n.call(this, e2);
        }
        e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
          return this.data.charCodeAt(this.zero + e2);
        }, i.prototype.lastIndexOfSignature = function(e2) {
          return this.data.lastIndexOf(e2) - this.zero;
        }, i.prototype.readAndCheckSignature = function(e2) {
          return e2 === this.readData(4);
        }, i.prototype.readData = function(e2) {
          this.checkOffset(e2);
          var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./DataReader": 18 }], 21: [function(e, t, r) {
        "use strict";
        var n = e("./ArrayReader");
        function i(e2) {
          n.call(this, e2);
        }
        e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
          if (this.checkOffset(e2), 0 === e2) return new Uint8Array(0);
          var t2 = this.data.subarray(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("../support"), s = e("./ArrayReader"), a = e("./StringReader"), o = e("./NodeBufferReader"), h = e("./Uint8ArrayReader");
        t.exports = function(e2) {
          var t2 = n.getTypeOf(e2);
          return n.checkSupport(t2), "string" !== t2 || i.uint8array ? "nodebuffer" === t2 ? new o(e2) : i.uint8array ? new h(n.transformTo("uint8array", e2)) : new s(n.transformTo("array", e2)) : new a(e2);
        };
      }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(e, t, r) {
        "use strict";
        r.LOCAL_FILE_HEADER = "PK", r.CENTRAL_FILE_HEADER = "PK", r.CENTRAL_DIRECTORY_END = "PK", r.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", r.ZIP64_CENTRAL_DIRECTORY_END = "PK", r.DATA_DESCRIPTOR = "PK\x07\b";
      }, {}], 24: [function(e, t, r) {
        "use strict";
        var n = e("./GenericWorker"), i = e("../utils");
        function s(e2) {
          n.call(this, "ConvertWorker to " + e2), this.destType = e2;
        }
        i.inherits(s, n), s.prototype.processChunk = function(e2) {
          this.push({ data: i.transformTo(this.destType, e2.data), meta: e2.meta });
        }, t.exports = s;
      }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(e, t, r) {
        "use strict";
        var n = e("./GenericWorker"), i = e("../crc32");
        function s() {
          n.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
        }
        e("../utils").inherits(s, n), s.prototype.processChunk = function(e2) {
          this.streamInfo.crc32 = i(e2.data, this.streamInfo.crc32 || 0), this.push(e2);
        }, t.exports = s;
      }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("./GenericWorker");
        function s(e2) {
          i.call(this, "DataLengthProbe for " + e2), this.propName = e2, this.withStreamInfo(e2, 0);
        }
        n.inherits(s, i), s.prototype.processChunk = function(e2) {
          if (e2) {
            var t2 = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = t2 + e2.data.length;
          }
          i.prototype.processChunk.call(this, e2);
        }, t.exports = s;
      }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("./GenericWorker");
        function s(e2) {
          i.call(this, "DataWorker");
          var t2 = this;
          this.dataIsReady = false, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = false, e2.then(function(e3) {
            t2.dataIsReady = true, t2.data = e3, t2.max = e3 && e3.length || 0, t2.type = n.getTypeOf(e3), t2.isPaused || t2._tickAndRepeat();
          }, function(e3) {
            t2.error(e3);
          });
        }
        n.inherits(s, i), s.prototype.cleanUp = function() {
          i.prototype.cleanUp.call(this), this.data = null;
        }, s.prototype.resume = function() {
          return !!i.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = true, n.delay(this._tickAndRepeat, [], this)), true);
        }, s.prototype._tickAndRepeat = function() {
          this._tickScheduled = false, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (n.delay(this._tickAndRepeat, [], this), this._tickScheduled = true));
        }, s.prototype._tick = function() {
          if (this.isPaused || this.isFinished) return false;
          var e2 = null, t2 = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              e2 = this.data.substring(this.index, t2);
              break;
            case "uint8array":
              e2 = this.data.subarray(this.index, t2);
              break;
            case "array":
            case "nodebuffer":
              e2 = this.data.slice(this.index, t2);
          }
          return this.index = t2, this.push({ data: e2, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
        }, t.exports = s;
      }, { "../utils": 32, "./GenericWorker": 28 }], 28: [function(e, t, r) {
        "use strict";
        function n(e2) {
          this.name = e2 || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = true, this.isFinished = false, this.isLocked = false, this._listeners = { data: [], end: [], error: [] }, this.previous = null;
        }
        n.prototype = { push: function(e2) {
          this.emit("data", e2);
        }, end: function() {
          if (this.isFinished) return false;
          this.flush();
          try {
            this.emit("end"), this.cleanUp(), this.isFinished = true;
          } catch (e2) {
            this.emit("error", e2);
          }
          return true;
        }, error: function(e2) {
          return !this.isFinished && (this.isPaused ? this.generatedError = e2 : (this.isFinished = true, this.emit("error", e2), this.previous && this.previous.error(e2), this.cleanUp()), true);
        }, on: function(e2, t2) {
          return this._listeners[e2].push(t2), this;
        }, cleanUp: function() {
          this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
        }, emit: function(e2, t2) {
          if (this._listeners[e2]) for (var r2 = 0; r2 < this._listeners[e2].length; r2++) this._listeners[e2][r2].call(this, t2);
        }, pipe: function(e2) {
          return e2.registerPrevious(this);
        }, registerPrevious: function(e2) {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.streamInfo = e2.streamInfo, this.mergeStreamInfo(), this.previous = e2;
          var t2 = this;
          return e2.on("data", function(e3) {
            t2.processChunk(e3);
          }), e2.on("end", function() {
            t2.end();
          }), e2.on("error", function(e3) {
            t2.error(e3);
          }), this;
        }, pause: function() {
          return !this.isPaused && !this.isFinished && (this.isPaused = true, this.previous && this.previous.pause(), true);
        }, resume: function() {
          if (!this.isPaused || this.isFinished) return false;
          var e2 = this.isPaused = false;
          return this.generatedError && (this.error(this.generatedError), e2 = true), this.previous && this.previous.resume(), !e2;
        }, flush: function() {
        }, processChunk: function(e2) {
          this.push(e2);
        }, withStreamInfo: function(e2, t2) {
          return this.extraStreamInfo[e2] = t2, this.mergeStreamInfo(), this;
        }, mergeStreamInfo: function() {
          for (var e2 in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e2) && (this.streamInfo[e2] = this.extraStreamInfo[e2]);
        }, lock: function() {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.isLocked = true, this.previous && this.previous.lock();
        }, toString: function() {
          var e2 = "Worker " + this.name;
          return this.previous ? this.previous + " -> " + e2 : e2;
        } }, t.exports = n;
      }, {}], 29: [function(e, t, r) {
        "use strict";
        var h = e("../utils"), i = e("./ConvertWorker"), s = e("./GenericWorker"), u = e("../base64"), n = e("../support"), a = e("../external"), o = null;
        if (n.nodestream) try {
          o = e("../nodejs/NodejsStreamOutputAdapter");
        } catch (e2) {
        }
        function l(e2, o2) {
          return new a.Promise(function(t2, r2) {
            var n2 = [], i2 = e2._internalType, s2 = e2._outputType, a2 = e2._mimeType;
            e2.on("data", function(e3, t3) {
              n2.push(e3), o2 && o2(t3);
            }).on("error", function(e3) {
              n2 = [], r2(e3);
            }).on("end", function() {
              try {
                var e3 = (function(e4, t3, r3) {
                  switch (e4) {
                    case "blob":
                      return h.newBlob(h.transformTo("arraybuffer", t3), r3);
                    case "base64":
                      return u.encode(t3);
                    default:
                      return h.transformTo(e4, t3);
                  }
                })(s2, (function(e4, t3) {
                  var r3, n3 = 0, i3 = null, s3 = 0;
                  for (r3 = 0; r3 < t3.length; r3++) s3 += t3[r3].length;
                  switch (e4) {
                    case "string":
                      return t3.join("");
                    case "array":
                      return Array.prototype.concat.apply([], t3);
                    case "uint8array":
                      for (i3 = new Uint8Array(s3), r3 = 0; r3 < t3.length; r3++) i3.set(t3[r3], n3), n3 += t3[r3].length;
                      return i3;
                    case "nodebuffer":
                      return Buffer.concat(t3);
                    default:
                      throw new Error("concat : unsupported type '" + e4 + "'");
                  }
                })(i2, n2), a2);
                t2(e3);
              } catch (e4) {
                r2(e4);
              }
              n2 = [];
            }).resume();
          });
        }
        function f(e2, t2, r2) {
          var n2 = t2;
          switch (t2) {
            case "blob":
            case "arraybuffer":
              n2 = "uint8array";
              break;
            case "base64":
              n2 = "string";
          }
          try {
            this._internalType = n2, this._outputType = t2, this._mimeType = r2, h.checkSupport(n2), this._worker = e2.pipe(new i(n2)), e2.lock();
          } catch (e3) {
            this._worker = new s("error"), this._worker.error(e3);
          }
        }
        f.prototype = { accumulate: function(e2) {
          return l(this, e2);
        }, on: function(e2, t2) {
          var r2 = this;
          return "data" === e2 ? this._worker.on(e2, function(e3) {
            t2.call(r2, e3.data, e3.meta);
          }) : this._worker.on(e2, function() {
            h.delay(t2, arguments, r2);
          }), this;
        }, resume: function() {
          return h.delay(this._worker.resume, [], this._worker), this;
        }, pause: function() {
          return this._worker.pause(), this;
        }, toNodejsStream: function(e2) {
          if (h.checkSupport("nodestream"), "nodebuffer" !== this._outputType) throw new Error(this._outputType + " is not supported by this method");
          return new o(this, { objectMode: "nodebuffer" !== this._outputType }, e2);
        } }, t.exports = f;
      }, { "../base64": 1, "../external": 6, "../nodejs/NodejsStreamOutputAdapter": 13, "../support": 30, "../utils": 32, "./ConvertWorker": 24, "./GenericWorker": 28 }], 30: [function(e, t, r) {
        "use strict";
        if (r.base64 = true, r.array = true, r.string = true, r.arraybuffer = "undefined" != typeof ArrayBuffer && "undefined" != typeof Uint8Array, r.nodebuffer = "undefined" != typeof Buffer, r.uint8array = "undefined" != typeof Uint8Array, "undefined" == typeof ArrayBuffer) r.blob = false;
        else {
          var n = new ArrayBuffer(0);
          try {
            r.blob = 0 === new Blob([n], { type: "application/zip" }).size;
          } catch (e2) {
            try {
              var i = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              i.append(n), r.blob = 0 === i.getBlob("application/zip").size;
            } catch (e3) {
              r.blob = false;
            }
          }
        }
        try {
          r.nodestream = !!e("readable-stream").Readable;
        } catch (e2) {
          r.nodestream = false;
        }
      }, { "readable-stream": 16 }], 31: [function(e, t, s) {
        "use strict";
        for (var o = e("./utils"), h = e("./support"), r = e("./nodejsUtils"), n = e("./stream/GenericWorker"), u = new Array(256), i = 0; i < 256; i++) u[i] = 252 <= i ? 6 : 248 <= i ? 5 : 240 <= i ? 4 : 224 <= i ? 3 : 192 <= i ? 2 : 1;
        u[254] = u[254] = 1;
        function a() {
          n.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function l() {
          n.call(this, "utf-8 encode");
        }
        s.utf8encode = function(e2) {
          return h.nodebuffer ? r.newBufferFrom(e2, "utf-8") : (function(e3) {
            var t2, r2, n2, i2, s2, a2 = e3.length, o2 = 0;
            for (i2 = 0; i2 < a2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o2 += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
            for (t2 = h.uint8array ? new Uint8Array(o2) : new Array(o2), i2 = s2 = 0; s2 < o2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
            return t2;
          })(e2);
        }, s.utf8decode = function(e2) {
          return h.nodebuffer ? o.transformTo("nodebuffer", e2).toString("utf-8") : (function(e3) {
            var t2, r2, n2, i2, s2 = e3.length, a2 = new Array(2 * s2);
            for (t2 = r2 = 0; t2 < s2; ) if ((n2 = e3[t2++]) < 128) a2[r2++] = n2;
            else if (4 < (i2 = u[n2])) a2[r2++] = 65533, t2 += i2 - 1;
            else {
              for (n2 &= 2 === i2 ? 31 : 3 === i2 ? 15 : 7; 1 < i2 && t2 < s2; ) n2 = n2 << 6 | 63 & e3[t2++], i2--;
              1 < i2 ? a2[r2++] = 65533 : n2 < 65536 ? a2[r2++] = n2 : (n2 -= 65536, a2[r2++] = 55296 | n2 >> 10 & 1023, a2[r2++] = 56320 | 1023 & n2);
            }
            return a2.length !== r2 && (a2.subarray ? a2 = a2.subarray(0, r2) : a2.length = r2), o.applyFromCharCode(a2);
          })(e2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2));
        }, o.inherits(a, n), a.prototype.processChunk = function(e2) {
          var t2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2.data);
          if (this.leftOver && this.leftOver.length) {
            if (h.uint8array) {
              var r2 = t2;
              (t2 = new Uint8Array(r2.length + this.leftOver.length)).set(this.leftOver, 0), t2.set(r2, this.leftOver.length);
            } else t2 = this.leftOver.concat(t2);
            this.leftOver = null;
          }
          var n2 = (function(e3, t3) {
            var r3;
            for ((t3 = t3 || e3.length) > e3.length && (t3 = e3.length), r3 = t3 - 1; 0 <= r3 && 128 == (192 & e3[r3]); ) r3--;
            return r3 < 0 ? t3 : 0 === r3 ? t3 : r3 + u[e3[r3]] > t3 ? r3 : t3;
          })(t2), i2 = t2;
          n2 !== t2.length && (h.uint8array ? (i2 = t2.subarray(0, n2), this.leftOver = t2.subarray(n2, t2.length)) : (i2 = t2.slice(0, n2), this.leftOver = t2.slice(n2, t2.length))), this.push({ data: s.utf8decode(i2), meta: e2.meta });
        }, a.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, s.Utf8DecodeWorker = a, o.inherits(l, n), l.prototype.processChunk = function(e2) {
          this.push({ data: s.utf8encode(e2.data), meta: e2.meta });
        }, s.Utf8EncodeWorker = l;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, t, a) {
        "use strict";
        var o = e("./support"), h = e("./base64"), r = e("./nodejsUtils"), u = e("./external");
        function n(e2) {
          return e2;
        }
        function l(e2, t2) {
          for (var r2 = 0; r2 < e2.length; ++r2) t2[r2] = 255 & e2.charCodeAt(r2);
          return t2;
        }
        e("setimmediate"), a.newBlob = function(t2, r2) {
          a.checkSupport("blob");
          try {
            return new Blob([t2], { type: r2 });
          } catch (e2) {
            try {
              var n2 = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return n2.append(t2), n2.getBlob(r2);
            } catch (e3) {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var i = { stringifyByChunk: function(e2, t2, r2) {
          var n2 = [], i2 = 0, s2 = e2.length;
          if (s2 <= r2) return String.fromCharCode.apply(null, e2);
          for (; i2 < s2; ) "array" === t2 || "nodebuffer" === t2 ? n2.push(String.fromCharCode.apply(null, e2.slice(i2, Math.min(i2 + r2, s2)))) : n2.push(String.fromCharCode.apply(null, e2.subarray(i2, Math.min(i2 + r2, s2)))), i2 += r2;
          return n2.join("");
        }, stringifyByChar: function(e2) {
          for (var t2 = "", r2 = 0; r2 < e2.length; r2++) t2 += String.fromCharCode(e2[r2]);
          return t2;
        }, applyCanBeUsed: { uint8array: (function() {
          try {
            return o.uint8array && 1 === String.fromCharCode.apply(null, new Uint8Array(1)).length;
          } catch (e2) {
            return false;
          }
        })(), nodebuffer: (function() {
          try {
            return o.nodebuffer && 1 === String.fromCharCode.apply(null, r.allocBuffer(1)).length;
          } catch (e2) {
            return false;
          }
        })() } };
        function s(e2) {
          var t2 = 65536, r2 = a.getTypeOf(e2), n2 = true;
          if ("uint8array" === r2 ? n2 = i.applyCanBeUsed.uint8array : "nodebuffer" === r2 && (n2 = i.applyCanBeUsed.nodebuffer), n2) for (; 1 < t2; ) try {
            return i.stringifyByChunk(e2, r2, t2);
          } catch (e3) {
            t2 = Math.floor(t2 / 2);
          }
          return i.stringifyByChar(e2);
        }
        function f(e2, t2) {
          for (var r2 = 0; r2 < e2.length; r2++) t2[r2] = e2[r2];
          return t2;
        }
        a.applyFromCharCode = s;
        var c = {};
        c.string = { string: n, array: function(e2) {
          return l(e2, new Array(e2.length));
        }, arraybuffer: function(e2) {
          return c.string.uint8array(e2).buffer;
        }, uint8array: function(e2) {
          return l(e2, new Uint8Array(e2.length));
        }, nodebuffer: function(e2) {
          return l(e2, r.allocBuffer(e2.length));
        } }, c.array = { string: s, array: n, arraybuffer: function(e2) {
          return new Uint8Array(e2).buffer;
        }, uint8array: function(e2) {
          return new Uint8Array(e2);
        }, nodebuffer: function(e2) {
          return r.newBufferFrom(e2);
        } }, c.arraybuffer = { string: function(e2) {
          return s(new Uint8Array(e2));
        }, array: function(e2) {
          return f(new Uint8Array(e2), new Array(e2.byteLength));
        }, arraybuffer: n, uint8array: function(e2) {
          return new Uint8Array(e2);
        }, nodebuffer: function(e2) {
          return r.newBufferFrom(new Uint8Array(e2));
        } }, c.uint8array = { string: s, array: function(e2) {
          return f(e2, new Array(e2.length));
        }, arraybuffer: function(e2) {
          return e2.buffer;
        }, uint8array: n, nodebuffer: function(e2) {
          return r.newBufferFrom(e2);
        } }, c.nodebuffer = { string: s, array: function(e2) {
          return f(e2, new Array(e2.length));
        }, arraybuffer: function(e2) {
          return c.nodebuffer.uint8array(e2).buffer;
        }, uint8array: function(e2) {
          return f(e2, new Uint8Array(e2.length));
        }, nodebuffer: n }, a.transformTo = function(e2, t2) {
          if (t2 = t2 || "", !e2) return t2;
          a.checkSupport(e2);
          var r2 = a.getTypeOf(t2);
          return c[r2][e2](t2);
        }, a.resolve = function(e2) {
          for (var t2 = e2.split("/"), r2 = [], n2 = 0; n2 < t2.length; n2++) {
            var i2 = t2[n2];
            "." === i2 || "" === i2 && 0 !== n2 && n2 !== t2.length - 1 || (".." === i2 ? r2.pop() : r2.push(i2));
          }
          return r2.join("/");
        }, a.getTypeOf = function(e2) {
          if ("string" == typeof e2) return "string";
          var t2 = Object.prototype.toString.call(e2);
          return "[object Array]" === t2 ? "array" : o.nodebuffer && r.isBuffer(e2) ? "nodebuffer" : o.uint8array && "[object Uint8Array]" === t2 ? "uint8array" : o.arraybuffer && "[object ArrayBuffer]" === t2 ? "arraybuffer" : void 0;
        }, a.checkSupport = function(e2) {
          if (!o[e2.toLowerCase()]) throw new Error(e2 + " is not supported by this platform");
        }, a.MAX_VALUE_16BITS = 65535, a.MAX_VALUE_32BITS = -1, a.pretty = function(e2) {
          var t2, r2, n2 = "";
          for (r2 = 0; r2 < (e2 || "").length; r2++) n2 += "\\x" + ((t2 = e2.charCodeAt(r2)) < 16 ? "0" : "") + t2.toString(16).toUpperCase();
          return n2;
        }, a.delay = function(e2, t2, r2) {
          setImmediate(function() {
            e2.apply(r2 || null, t2 || []);
          });
        }, a.inherits = function(e2, t2) {
          function r2() {
          }
          r2.prototype = t2.prototype, e2.prototype = new r2();
        }, a.extend = function() {
          var e2, t2, r2 = {};
          for (e2 = 0; e2 < arguments.length; e2++) for (t2 in arguments[e2]) Object.prototype.hasOwnProperty.call(arguments[e2], t2) && void 0 === r2[t2] && (r2[t2] = arguments[e2][t2]);
          return r2;
        }, a.prepareContent = function(r2, e2, n2, i2, s2) {
          return u.Promise.resolve(e2).then(function(n3) {
            return o.blob && (n3 instanceof Blob || -1 !== ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(n3))) ? void 0 !== Blob.prototype.arrayBuffer ? n3.arrayBuffer() : "undefined" != typeof FileReader ? new u.Promise(function(t2, r3) {
              var e3 = new FileReader();
              e3.onload = function(e4) {
                t2(e4.target.result);
              }, e3.onerror = function(e4) {
                r3(e4.target.error);
              }, e3.readAsArrayBuffer(n3);
            }) : u.Promise.reject(new Error(r2 + " is a Blob, but we have no way of reading it.")) : n3;
          }).then(function(e3) {
            var t2 = a.getTypeOf(e3);
            return t2 ? ("arraybuffer" === t2 ? e3 = a.transformTo("uint8array", e3) : "string" === t2 && (s2 ? e3 = h.decode(e3) : n2 && true !== i2 && (e3 = (function(e4) {
              return l(e4, o.uint8array ? new Uint8Array(e4.length) : new Array(e4.length));
            })(e3))), e3) : u.Promise.reject(new Error("Can't read the data of '" + r2 + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, t, r) {
        "use strict";
        var n = e("./reader/readerFor"), i = e("./utils"), s = e("./signature"), a = e("./zipEntry"), o = e("./support");
        function h(e2) {
          this.files = [], this.loadOptions = e2;
        }
        h.prototype = { checkSignature: function(e2) {
          if (!this.reader.readAndCheckSignature(e2)) {
            this.reader.index -= 4;
            var t2 = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature (" + i.pretty(t2) + ", expected " + i.pretty(e2) + ")");
          }
        }, isSignature: function(e2, t2) {
          var r2 = this.reader.index;
          this.reader.setIndex(e2);
          var n2 = this.reader.readString(4) === t2;
          return this.reader.setIndex(r2), n2;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var e2 = this.reader.readData(this.zipCommentLength), t2 = o.uint8array ? "uint8array" : "array", r2 = i.transformTo(t2, e2);
          this.zipComment = this.loadOptions.decodeFileName(r2);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var e2, t2, r2, n2 = this.zip64EndOfCentralSize - 44; 0 < n2; ) e2 = this.reader.readInt(2), t2 = this.reader.readInt(4), r2 = this.reader.readData(t2), this.zip64ExtensibleData[e2] = { id: e2, length: t2, value: r2 };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var e2, t2;
          for (e2 = 0; e2 < this.files.length; e2++) t2 = this.files[e2], this.reader.setIndex(t2.localHeaderOffset), this.checkSignature(s.LOCAL_FILE_HEADER), t2.readLocalPart(this.reader), t2.handleUTF8(), t2.processAttributes();
        }, readCentralDir: function() {
          var e2;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER); ) (e2 = new a({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(e2);
          if (this.centralDirRecords !== this.files.length && 0 !== this.centralDirRecords && 0 === this.files.length) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
        }, readEndOfCentral: function() {
          var e2 = this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);
          if (e2 < 0) throw !this.isSignature(0, s.LOCAL_FILE_HEADER) ? new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html") : new Error("Corrupted zip: can't find end of central directory");
          this.reader.setIndex(e2);
          var t2 = e2;
          if (this.checkSignature(s.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === i.MAX_VALUE_16BITS || this.diskWithCentralDirStart === i.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === i.MAX_VALUE_16BITS || this.centralDirRecords === i.MAX_VALUE_16BITS || this.centralDirSize === i.MAX_VALUE_32BITS || this.centralDirOffset === i.MAX_VALUE_32BITS) {
            if (this.zip64 = true, (e2 = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            if (this.reader.setIndex(e2), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, s.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
          }
          var r2 = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (r2 += 20, r2 += 12 + this.zip64EndOfCentralSize);
          var n2 = t2 - r2;
          if (0 < n2) this.isSignature(t2, s.CENTRAL_FILE_HEADER) || (this.reader.zero = n2);
          else if (n2 < 0) throw new Error("Corrupted zip: missing " + Math.abs(n2) + " bytes.");
        }, prepareReader: function(e2) {
          this.reader = n(e2);
        }, load: function(e2) {
          this.prepareReader(e2), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, t.exports = h;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, t, r) {
        "use strict";
        var n = e("./reader/readerFor"), s = e("./utils"), i = e("./compressedObject"), a = e("./crc32"), o = e("./utf8"), h = e("./compressions"), u = e("./support");
        function l(e2, t2) {
          this.options = e2, this.loadOptions = t2;
        }
        l.prototype = { isEncrypted: function() {
          return 1 == (1 & this.bitFlag);
        }, useUTF8: function() {
          return 2048 == (2048 & this.bitFlag);
        }, readLocalPart: function(e2) {
          var t2, r2;
          if (e2.skip(22), this.fileNameLength = e2.readInt(2), r2 = e2.readInt(2), this.fileName = e2.readData(this.fileNameLength), e2.skip(r2), -1 === this.compressedSize || -1 === this.uncompressedSize) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if (null === (t2 = (function(e3) {
            for (var t3 in h) if (Object.prototype.hasOwnProperty.call(h, t3) && h[t3].magic === e3) return h[t3];
            return null;
          })(this.compressionMethod))) throw new Error("Corrupted zip : compression " + s.pretty(this.compressionMethod) + " unknown (inner file : " + s.transformTo("string", this.fileName) + ")");
          this.decompressed = new i(this.compressedSize, this.uncompressedSize, this.crc32, t2, e2.readData(this.compressedSize));
        }, readCentralPart: function(e2) {
          this.versionMadeBy = e2.readInt(2), e2.skip(2), this.bitFlag = e2.readInt(2), this.compressionMethod = e2.readString(2), this.date = e2.readDate(), this.crc32 = e2.readInt(4), this.compressedSize = e2.readInt(4), this.uncompressedSize = e2.readInt(4);
          var t2 = e2.readInt(2);
          if (this.extraFieldsLength = e2.readInt(2), this.fileCommentLength = e2.readInt(2), this.diskNumberStart = e2.readInt(2), this.internalFileAttributes = e2.readInt(2), this.externalFileAttributes = e2.readInt(4), this.localHeaderOffset = e2.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
          e2.skip(t2), this.readExtraFields(e2), this.parseZIP64ExtraField(e2), this.fileComment = e2.readData(this.fileCommentLength);
        }, processAttributes: function() {
          this.unixPermissions = null, this.dosPermissions = null;
          var e2 = this.versionMadeBy >> 8;
          this.dir = !!(16 & this.externalFileAttributes), 0 == e2 && (this.dosPermissions = 63 & this.externalFileAttributes), 3 == e2 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || "/" !== this.fileNameStr.slice(-1) || (this.dir = true);
        }, parseZIP64ExtraField: function() {
          if (this.extraFields[1]) {
            var e2 = n(this.extraFields[1].value);
            this.uncompressedSize === s.MAX_VALUE_32BITS && (this.uncompressedSize = e2.readInt(8)), this.compressedSize === s.MAX_VALUE_32BITS && (this.compressedSize = e2.readInt(8)), this.localHeaderOffset === s.MAX_VALUE_32BITS && (this.localHeaderOffset = e2.readInt(8)), this.diskNumberStart === s.MAX_VALUE_32BITS && (this.diskNumberStart = e2.readInt(4));
          }
        }, readExtraFields: function(e2) {
          var t2, r2, n2, i2 = e2.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); e2.index + 4 < i2; ) t2 = e2.readInt(2), r2 = e2.readInt(2), n2 = e2.readData(r2), this.extraFields[t2] = { id: t2, length: r2, value: n2 };
          e2.setIndex(i2);
        }, handleUTF8: function() {
          var e2 = u.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = o.utf8decode(this.fileName), this.fileCommentStr = o.utf8decode(this.fileComment);
          else {
            var t2 = this.findExtraFieldUnicodePath();
            if (null !== t2) this.fileNameStr = t2;
            else {
              var r2 = s.transformTo(e2, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(r2);
            }
            var n2 = this.findExtraFieldUnicodeComment();
            if (null !== n2) this.fileCommentStr = n2;
            else {
              var i2 = s.transformTo(e2, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(i2);
            }
          }
        }, findExtraFieldUnicodePath: function() {
          var e2 = this.extraFields[28789];
          if (e2) {
            var t2 = n(e2.value);
            return 1 !== t2.readInt(1) ? null : a(this.fileName) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
          }
          return null;
        }, findExtraFieldUnicodeComment: function() {
          var e2 = this.extraFields[25461];
          if (e2) {
            var t2 = n(e2.value);
            return 1 !== t2.readInt(1) ? null : a(this.fileComment) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
          }
          return null;
        } }, t.exports = l;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, t, r) {
        "use strict";
        function n(e2, t2, r2) {
          this.name = e2, this.dir = r2.dir, this.date = r2.date, this.comment = r2.comment, this.unixPermissions = r2.unixPermissions, this.dosPermissions = r2.dosPermissions, this._data = t2, this._dataBinary = r2.binary, this.options = { compression: r2.compression, compressionOptions: r2.compressionOptions };
        }
        var s = e("./stream/StreamHelper"), i = e("./stream/DataWorker"), a = e("./utf8"), o = e("./compressedObject"), h = e("./stream/GenericWorker");
        n.prototype = { internalStream: function(e2) {
          var t2 = null, r2 = "string";
          try {
            if (!e2) throw new Error("No output type specified.");
            var n2 = "string" === (r2 = e2.toLowerCase()) || "text" === r2;
            "binarystring" !== r2 && "text" !== r2 || (r2 = "string"), t2 = this._decompressWorker();
            var i2 = !this._dataBinary;
            i2 && !n2 && (t2 = t2.pipe(new a.Utf8EncodeWorker())), !i2 && n2 && (t2 = t2.pipe(new a.Utf8DecodeWorker()));
          } catch (e3) {
            (t2 = new h("error")).error(e3);
          }
          return new s(t2, r2, "");
        }, async: function(e2, t2) {
          return this.internalStream(e2).accumulate(t2);
        }, nodeStream: function(e2, t2) {
          return this.internalStream(e2 || "nodebuffer").toNodejsStream(t2);
        }, _compressWorker: function(e2, t2) {
          if (this._data instanceof o && this._data.compression.magic === e2.magic) return this._data.getCompressedWorker();
          var r2 = this._decompressWorker();
          return this._dataBinary || (r2 = r2.pipe(new a.Utf8EncodeWorker())), o.createWorkerFrom(r2, e2, t2);
        }, _decompressWorker: function() {
          return this._data instanceof o ? this._data.getContentWorker() : this._data instanceof h ? this._data : new i(this._data);
        } };
        for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], l = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, f = 0; f < u.length; f++) n.prototype[u[f]] = l;
        t.exports = n;
      }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, l, t) {
        (function(t2) {
          "use strict";
          var r, n, e2 = t2.MutationObserver || t2.WebKitMutationObserver;
          if (e2) {
            var i = 0, s = new e2(u), a = t2.document.createTextNode("");
            s.observe(a, { characterData: true }), r = function() {
              a.data = i = ++i % 2;
            };
          } else if (t2.setImmediate || void 0 === t2.MessageChannel) r = "document" in t2 && "onreadystatechange" in t2.document.createElement("script") ? function() {
            var e3 = t2.document.createElement("script");
            e3.onreadystatechange = function() {
              u(), e3.onreadystatechange = null, e3.parentNode.removeChild(e3), e3 = null;
            }, t2.document.documentElement.appendChild(e3);
          } : function() {
            setTimeout(u, 0);
          };
          else {
            var o = new t2.MessageChannel();
            o.port1.onmessage = u, r = function() {
              o.port2.postMessage(0);
            };
          }
          var h = [];
          function u() {
            var e3, t3;
            n = true;
            for (var r2 = h.length; r2; ) {
              for (t3 = h, h = [], e3 = -1; ++e3 < r2; ) t3[e3]();
              r2 = h.length;
            }
            n = false;
          }
          l.exports = function(e3) {
            1 !== h.push(e3) || n || r();
          };
        }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
      }, {}], 37: [function(e, t, r) {
        "use strict";
        var i = e("immediate");
        function u() {
        }
        var l = {}, s = ["REJECTED"], a = ["FULFILLED"], n = ["PENDING"];
        function o(e2) {
          if ("function" != typeof e2) throw new TypeError("resolver must be a function");
          this.state = n, this.queue = [], this.outcome = void 0, e2 !== u && d(this, e2);
        }
        function h(e2, t2, r2) {
          this.promise = e2, "function" == typeof t2 && (this.onFulfilled = t2, this.callFulfilled = this.otherCallFulfilled), "function" == typeof r2 && (this.onRejected = r2, this.callRejected = this.otherCallRejected);
        }
        function f(t2, r2, n2) {
          i(function() {
            var e2;
            try {
              e2 = r2(n2);
            } catch (e3) {
              return l.reject(t2, e3);
            }
            e2 === t2 ? l.reject(t2, new TypeError("Cannot resolve promise with itself")) : l.resolve(t2, e2);
          });
        }
        function c(e2) {
          var t2 = e2 && e2.then;
          if (e2 && ("object" == typeof e2 || "function" == typeof e2) && "function" == typeof t2) return function() {
            t2.apply(e2, arguments);
          };
        }
        function d(t2, e2) {
          var r2 = false;
          function n2(e3) {
            r2 || (r2 = true, l.reject(t2, e3));
          }
          function i2(e3) {
            r2 || (r2 = true, l.resolve(t2, e3));
          }
          var s2 = p(function() {
            e2(i2, n2);
          });
          "error" === s2.status && n2(s2.value);
        }
        function p(e2, t2) {
          var r2 = {};
          try {
            r2.value = e2(t2), r2.status = "success";
          } catch (e3) {
            r2.status = "error", r2.value = e3;
          }
          return r2;
        }
        (t.exports = o).prototype.finally = function(t2) {
          if ("function" != typeof t2) return this;
          var r2 = this.constructor;
          return this.then(function(e2) {
            return r2.resolve(t2()).then(function() {
              return e2;
            });
          }, function(e2) {
            return r2.resolve(t2()).then(function() {
              throw e2;
            });
          });
        }, o.prototype.catch = function(e2) {
          return this.then(null, e2);
        }, o.prototype.then = function(e2, t2) {
          if ("function" != typeof e2 && this.state === a || "function" != typeof t2 && this.state === s) return this;
          var r2 = new this.constructor(u);
          this.state !== n ? f(r2, this.state === a ? e2 : t2, this.outcome) : this.queue.push(new h(r2, e2, t2));
          return r2;
        }, h.prototype.callFulfilled = function(e2) {
          l.resolve(this.promise, e2);
        }, h.prototype.otherCallFulfilled = function(e2) {
          f(this.promise, this.onFulfilled, e2);
        }, h.prototype.callRejected = function(e2) {
          l.reject(this.promise, e2);
        }, h.prototype.otherCallRejected = function(e2) {
          f(this.promise, this.onRejected, e2);
        }, l.resolve = function(e2, t2) {
          var r2 = p(c, t2);
          if ("error" === r2.status) return l.reject(e2, r2.value);
          var n2 = r2.value;
          if (n2) d(e2, n2);
          else {
            e2.state = a, e2.outcome = t2;
            for (var i2 = -1, s2 = e2.queue.length; ++i2 < s2; ) e2.queue[i2].callFulfilled(t2);
          }
          return e2;
        }, l.reject = function(e2, t2) {
          e2.state = s, e2.outcome = t2;
          for (var r2 = -1, n2 = e2.queue.length; ++r2 < n2; ) e2.queue[r2].callRejected(t2);
          return e2;
        }, o.resolve = function(e2) {
          if (e2 instanceof this) return e2;
          return l.resolve(new this(u), e2);
        }, o.reject = function(e2) {
          var t2 = new this(u);
          return l.reject(t2, e2);
        }, o.all = function(e2) {
          var r2 = this;
          if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
          var n2 = e2.length, i2 = false;
          if (!n2) return this.resolve([]);
          var s2 = new Array(n2), a2 = 0, t2 = -1, o2 = new this(u);
          for (; ++t2 < n2; ) h2(e2[t2], t2);
          return o2;
          function h2(e3, t3) {
            r2.resolve(e3).then(function(e4) {
              s2[t3] = e4, ++a2 !== n2 || i2 || (i2 = true, l.resolve(o2, s2));
            }, function(e4) {
              i2 || (i2 = true, l.reject(o2, e4));
            });
          }
        }, o.race = function(e2) {
          var t2 = this;
          if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
          var r2 = e2.length, n2 = false;
          if (!r2) return this.resolve([]);
          var i2 = -1, s2 = new this(u);
          for (; ++i2 < r2; ) a2 = e2[i2], t2.resolve(a2).then(function(e3) {
            n2 || (n2 = true, l.resolve(s2, e3));
          }, function(e3) {
            n2 || (n2 = true, l.reject(s2, e3));
          });
          var a2;
          return s2;
        };
      }, { immediate: 36 }], 38: [function(e, t, r) {
        "use strict";
        var n = {};
        (0, e("./lib/utils/common").assign)(n, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = n;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, t, r) {
        "use strict";
        var a = e("./zlib/deflate"), o = e("./utils/common"), h = e("./utils/strings"), i = e("./zlib/messages"), s = e("./zlib/zstream"), u = Object.prototype.toString, l = 0, f = -1, c = 0, d = 8;
        function p(e2) {
          if (!(this instanceof p)) return new p(e2);
          this.options = o.assign({ level: f, method: d, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: c, to: "" }, e2 || {});
          var t2 = this.options;
          t2.raw && 0 < t2.windowBits ? t2.windowBits = -t2.windowBits : t2.gzip && 0 < t2.windowBits && t2.windowBits < 16 && (t2.windowBits += 16), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
          var r2 = a.deflateInit2(this.strm, t2.level, t2.method, t2.windowBits, t2.memLevel, t2.strategy);
          if (r2 !== l) throw new Error(i[r2]);
          if (t2.header && a.deflateSetHeader(this.strm, t2.header), t2.dictionary) {
            var n2;
            if (n2 = "string" == typeof t2.dictionary ? h.string2buf(t2.dictionary) : "[object ArrayBuffer]" === u.call(t2.dictionary) ? new Uint8Array(t2.dictionary) : t2.dictionary, (r2 = a.deflateSetDictionary(this.strm, n2)) !== l) throw new Error(i[r2]);
            this._dict_set = true;
          }
        }
        function n(e2, t2) {
          var r2 = new p(t2);
          if (r2.push(e2, true), r2.err) throw r2.msg || i[r2.err];
          return r2.result;
        }
        p.prototype.push = function(e2, t2) {
          var r2, n2, i2 = this.strm, s2 = this.options.chunkSize;
          if (this.ended) return false;
          n2 = t2 === ~~t2 ? t2 : true === t2 ? 4 : 0, "string" == typeof e2 ? i2.input = h.string2buf(e2) : "[object ArrayBuffer]" === u.call(e2) ? i2.input = new Uint8Array(e2) : i2.input = e2, i2.next_in = 0, i2.avail_in = i2.input.length;
          do {
            if (0 === i2.avail_out && (i2.output = new o.Buf8(s2), i2.next_out = 0, i2.avail_out = s2), 1 !== (r2 = a.deflate(i2, n2)) && r2 !== l) return this.onEnd(r2), !(this.ended = true);
            0 !== i2.avail_out && (0 !== i2.avail_in || 4 !== n2 && 2 !== n2) || ("string" === this.options.to ? this.onData(h.buf2binstring(o.shrinkBuf(i2.output, i2.next_out))) : this.onData(o.shrinkBuf(i2.output, i2.next_out)));
          } while ((0 < i2.avail_in || 0 === i2.avail_out) && 1 !== r2);
          return 4 === n2 ? (r2 = a.deflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === l) : 2 !== n2 || (this.onEnd(l), !(i2.avail_out = 0));
        }, p.prototype.onData = function(e2) {
          this.chunks.push(e2);
        }, p.prototype.onEnd = function(e2) {
          e2 === l && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
        }, r.Deflate = p, r.deflate = n, r.deflateRaw = function(e2, t2) {
          return (t2 = t2 || {}).raw = true, n(e2, t2);
        }, r.gzip = function(e2, t2) {
          return (t2 = t2 || {}).gzip = true, n(e2, t2);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, t, r) {
        "use strict";
        var c = e("./zlib/inflate"), d = e("./utils/common"), p = e("./utils/strings"), m = e("./zlib/constants"), n = e("./zlib/messages"), i = e("./zlib/zstream"), s = e("./zlib/gzheader"), _ = Object.prototype.toString;
        function a(e2) {
          if (!(this instanceof a)) return new a(e2);
          this.options = d.assign({ chunkSize: 16384, windowBits: 0, to: "" }, e2 || {});
          var t2 = this.options;
          t2.raw && 0 <= t2.windowBits && t2.windowBits < 16 && (t2.windowBits = -t2.windowBits, 0 === t2.windowBits && (t2.windowBits = -15)), !(0 <= t2.windowBits && t2.windowBits < 16) || e2 && e2.windowBits || (t2.windowBits += 32), 15 < t2.windowBits && t2.windowBits < 48 && 0 == (15 & t2.windowBits) && (t2.windowBits |= 15), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new i(), this.strm.avail_out = 0;
          var r2 = c.inflateInit2(this.strm, t2.windowBits);
          if (r2 !== m.Z_OK) throw new Error(n[r2]);
          this.header = new s(), c.inflateGetHeader(this.strm, this.header);
        }
        function o(e2, t2) {
          var r2 = new a(t2);
          if (r2.push(e2, true), r2.err) throw r2.msg || n[r2.err];
          return r2.result;
        }
        a.prototype.push = function(e2, t2) {
          var r2, n2, i2, s2, a2, o2, h = this.strm, u = this.options.chunkSize, l = this.options.dictionary, f = false;
          if (this.ended) return false;
          n2 = t2 === ~~t2 ? t2 : true === t2 ? m.Z_FINISH : m.Z_NO_FLUSH, "string" == typeof e2 ? h.input = p.binstring2buf(e2) : "[object ArrayBuffer]" === _.call(e2) ? h.input = new Uint8Array(e2) : h.input = e2, h.next_in = 0, h.avail_in = h.input.length;
          do {
            if (0 === h.avail_out && (h.output = new d.Buf8(u), h.next_out = 0, h.avail_out = u), (r2 = c.inflate(h, m.Z_NO_FLUSH)) === m.Z_NEED_DICT && l && (o2 = "string" == typeof l ? p.string2buf(l) : "[object ArrayBuffer]" === _.call(l) ? new Uint8Array(l) : l, r2 = c.inflateSetDictionary(this.strm, o2)), r2 === m.Z_BUF_ERROR && true === f && (r2 = m.Z_OK, f = false), r2 !== m.Z_STREAM_END && r2 !== m.Z_OK) return this.onEnd(r2), !(this.ended = true);
            h.next_out && (0 !== h.avail_out && r2 !== m.Z_STREAM_END && (0 !== h.avail_in || n2 !== m.Z_FINISH && n2 !== m.Z_SYNC_FLUSH) || ("string" === this.options.to ? (i2 = p.utf8border(h.output, h.next_out), s2 = h.next_out - i2, a2 = p.buf2string(h.output, i2), h.next_out = s2, h.avail_out = u - s2, s2 && d.arraySet(h.output, h.output, i2, s2, 0), this.onData(a2)) : this.onData(d.shrinkBuf(h.output, h.next_out)))), 0 === h.avail_in && 0 === h.avail_out && (f = true);
          } while ((0 < h.avail_in || 0 === h.avail_out) && r2 !== m.Z_STREAM_END);
          return r2 === m.Z_STREAM_END && (n2 = m.Z_FINISH), n2 === m.Z_FINISH ? (r2 = c.inflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === m.Z_OK) : n2 !== m.Z_SYNC_FLUSH || (this.onEnd(m.Z_OK), !(h.avail_out = 0));
        }, a.prototype.onData = function(e2) {
          this.chunks.push(e2);
        }, a.prototype.onEnd = function(e2) {
          e2 === m.Z_OK && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = d.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
        }, r.Inflate = a, r.inflate = o, r.inflateRaw = function(e2, t2) {
          return (t2 = t2 || {}).raw = true, o(e2, t2);
        }, r.ungzip = o;
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, t, r) {
        "use strict";
        var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
        r.assign = function(e2) {
          for (var t2 = Array.prototype.slice.call(arguments, 1); t2.length; ) {
            var r2 = t2.shift();
            if (r2) {
              if ("object" != typeof r2) throw new TypeError(r2 + "must be non-object");
              for (var n2 in r2) r2.hasOwnProperty(n2) && (e2[n2] = r2[n2]);
            }
          }
          return e2;
        }, r.shrinkBuf = function(e2, t2) {
          return e2.length === t2 ? e2 : e2.subarray ? e2.subarray(0, t2) : (e2.length = t2, e2);
        };
        var i = { arraySet: function(e2, t2, r2, n2, i2) {
          if (t2.subarray && e2.subarray) e2.set(t2.subarray(r2, r2 + n2), i2);
          else for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
        }, flattenChunks: function(e2) {
          var t2, r2, n2, i2, s2, a;
          for (t2 = n2 = 0, r2 = e2.length; t2 < r2; t2++) n2 += e2[t2].length;
          for (a = new Uint8Array(n2), t2 = i2 = 0, r2 = e2.length; t2 < r2; t2++) s2 = e2[t2], a.set(s2, i2), i2 += s2.length;
          return a;
        } }, s = { arraySet: function(e2, t2, r2, n2, i2) {
          for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
        }, flattenChunks: function(e2) {
          return [].concat.apply([], e2);
        } };
        r.setTyped = function(e2) {
          e2 ? (r.Buf8 = Uint8Array, r.Buf16 = Uint16Array, r.Buf32 = Int32Array, r.assign(r, i)) : (r.Buf8 = Array, r.Buf16 = Array, r.Buf32 = Array, r.assign(r, s));
        }, r.setTyped(n);
      }, {}], 42: [function(e, t, r) {
        "use strict";
        var h = e("./common"), i = true, s = true;
        try {
          String.fromCharCode.apply(null, [0]);
        } catch (e2) {
          i = false;
        }
        try {
          String.fromCharCode.apply(null, new Uint8Array(1));
        } catch (e2) {
          s = false;
        }
        for (var u = new h.Buf8(256), n = 0; n < 256; n++) u[n] = 252 <= n ? 6 : 248 <= n ? 5 : 240 <= n ? 4 : 224 <= n ? 3 : 192 <= n ? 2 : 1;
        function l(e2, t2) {
          if (t2 < 65537 && (e2.subarray && s || !e2.subarray && i)) return String.fromCharCode.apply(null, h.shrinkBuf(e2, t2));
          for (var r2 = "", n2 = 0; n2 < t2; n2++) r2 += String.fromCharCode(e2[n2]);
          return r2;
        }
        u[254] = u[254] = 1, r.string2buf = function(e2) {
          var t2, r2, n2, i2, s2, a = e2.length, o = 0;
          for (i2 = 0; i2 < a; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
          for (t2 = new h.Buf8(o), i2 = s2 = 0; s2 < o; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
          return t2;
        }, r.buf2binstring = function(e2) {
          return l(e2, e2.length);
        }, r.binstring2buf = function(e2) {
          for (var t2 = new h.Buf8(e2.length), r2 = 0, n2 = t2.length; r2 < n2; r2++) t2[r2] = e2.charCodeAt(r2);
          return t2;
        }, r.buf2string = function(e2, t2) {
          var r2, n2, i2, s2, a = t2 || e2.length, o = new Array(2 * a);
          for (r2 = n2 = 0; r2 < a; ) if ((i2 = e2[r2++]) < 128) o[n2++] = i2;
          else if (4 < (s2 = u[i2])) o[n2++] = 65533, r2 += s2 - 1;
          else {
            for (i2 &= 2 === s2 ? 31 : 3 === s2 ? 15 : 7; 1 < s2 && r2 < a; ) i2 = i2 << 6 | 63 & e2[r2++], s2--;
            1 < s2 ? o[n2++] = 65533 : i2 < 65536 ? o[n2++] = i2 : (i2 -= 65536, o[n2++] = 55296 | i2 >> 10 & 1023, o[n2++] = 56320 | 1023 & i2);
          }
          return l(o, n2);
        }, r.utf8border = function(e2, t2) {
          var r2;
          for ((t2 = t2 || e2.length) > e2.length && (t2 = e2.length), r2 = t2 - 1; 0 <= r2 && 128 == (192 & e2[r2]); ) r2--;
          return r2 < 0 ? t2 : 0 === r2 ? t2 : r2 + u[e2[r2]] > t2 ? r2 : t2;
        };
      }, { "./common": 41 }], 43: [function(e, t, r) {
        "use strict";
        t.exports = function(e2, t2, r2, n) {
          for (var i = 65535 & e2 | 0, s = e2 >>> 16 & 65535 | 0, a = 0; 0 !== r2; ) {
            for (r2 -= a = 2e3 < r2 ? 2e3 : r2; s = s + (i = i + t2[n++] | 0) | 0, --a; ) ;
            i %= 65521, s %= 65521;
          }
          return i | s << 16 | 0;
        };
      }, {}], 44: [function(e, t, r) {
        "use strict";
        t.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
      }, {}], 45: [function(e, t, r) {
        "use strict";
        var o = (function() {
          for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
            e2 = r2;
            for (var n = 0; n < 8; n++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
            t2[r2] = e2;
          }
          return t2;
        })();
        t.exports = function(e2, t2, r2, n) {
          var i = o, s = n + r2;
          e2 ^= -1;
          for (var a = n; a < s; a++) e2 = e2 >>> 8 ^ i[255 & (e2 ^ t2[a])];
          return -1 ^ e2;
        };
      }, {}], 46: [function(e, t, r) {
        "use strict";
        var h, c = e("../utils/common"), u = e("./trees"), d = e("./adler32"), p = e("./crc32"), n = e("./messages"), l = 0, f = 4, m = 0, _ = -2, g = -1, b = 4, i = 2, v = 8, y = 9, s = 286, a = 30, o = 19, w = 2 * s + 1, k = 15, x = 3, S = 258, z = S + x + 1, C = 42, E = 113, A = 1, I = 2, O = 3, B = 4;
        function R(e2, t2) {
          return e2.msg = n[t2], t2;
        }
        function T(e2) {
          return (e2 << 1) - (4 < e2 ? 9 : 0);
        }
        function D(e2) {
          for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
        }
        function F(e2) {
          var t2 = e2.state, r2 = t2.pending;
          r2 > e2.avail_out && (r2 = e2.avail_out), 0 !== r2 && (c.arraySet(e2.output, t2.pending_buf, t2.pending_out, r2, e2.next_out), e2.next_out += r2, t2.pending_out += r2, e2.total_out += r2, e2.avail_out -= r2, t2.pending -= r2, 0 === t2.pending && (t2.pending_out = 0));
        }
        function N(e2, t2) {
          u._tr_flush_block(e2, 0 <= e2.block_start ? e2.block_start : -1, e2.strstart - e2.block_start, t2), e2.block_start = e2.strstart, F(e2.strm);
        }
        function U(e2, t2) {
          e2.pending_buf[e2.pending++] = t2;
        }
        function P(e2, t2) {
          e2.pending_buf[e2.pending++] = t2 >>> 8 & 255, e2.pending_buf[e2.pending++] = 255 & t2;
        }
        function L(e2, t2) {
          var r2, n2, i2 = e2.max_chain_length, s2 = e2.strstart, a2 = e2.prev_length, o2 = e2.nice_match, h2 = e2.strstart > e2.w_size - z ? e2.strstart - (e2.w_size - z) : 0, u2 = e2.window, l2 = e2.w_mask, f2 = e2.prev, c2 = e2.strstart + S, d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
          e2.prev_length >= e2.good_match && (i2 >>= 2), o2 > e2.lookahead && (o2 = e2.lookahead);
          do {
            if (u2[(r2 = t2) + a2] === p2 && u2[r2 + a2 - 1] === d2 && u2[r2] === u2[s2] && u2[++r2] === u2[s2 + 1]) {
              s2 += 2, r2++;
              do {
              } while (u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && s2 < c2);
              if (n2 = S - (c2 - s2), s2 = c2 - S, a2 < n2) {
                if (e2.match_start = t2, o2 <= (a2 = n2)) break;
                d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
              }
            }
          } while ((t2 = f2[t2 & l2]) > h2 && 0 != --i2);
          return a2 <= e2.lookahead ? a2 : e2.lookahead;
        }
        function j(e2) {
          var t2, r2, n2, i2, s2, a2, o2, h2, u2, l2, f2 = e2.w_size;
          do {
            if (i2 = e2.window_size - e2.lookahead - e2.strstart, e2.strstart >= f2 + (f2 - z)) {
              for (c.arraySet(e2.window, e2.window, f2, f2, 0), e2.match_start -= f2, e2.strstart -= f2, e2.block_start -= f2, t2 = r2 = e2.hash_size; n2 = e2.head[--t2], e2.head[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
              for (t2 = r2 = f2; n2 = e2.prev[--t2], e2.prev[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
              i2 += f2;
            }
            if (0 === e2.strm.avail_in) break;
            if (a2 = e2.strm, o2 = e2.window, h2 = e2.strstart + e2.lookahead, u2 = i2, l2 = void 0, l2 = a2.avail_in, u2 < l2 && (l2 = u2), r2 = 0 === l2 ? 0 : (a2.avail_in -= l2, c.arraySet(o2, a2.input, a2.next_in, l2, h2), 1 === a2.state.wrap ? a2.adler = d(a2.adler, o2, l2, h2) : 2 === a2.state.wrap && (a2.adler = p(a2.adler, o2, l2, h2)), a2.next_in += l2, a2.total_in += l2, l2), e2.lookahead += r2, e2.lookahead + e2.insert >= x) for (s2 = e2.strstart - e2.insert, e2.ins_h = e2.window[s2], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + 1]) & e2.hash_mask; e2.insert && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + x - 1]) & e2.hash_mask, e2.prev[s2 & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = s2, s2++, e2.insert--, !(e2.lookahead + e2.insert < x)); ) ;
          } while (e2.lookahead < z && 0 !== e2.strm.avail_in);
        }
        function Z(e2, t2) {
          for (var r2, n2; ; ) {
            if (e2.lookahead < z) {
              if (j(e2), e2.lookahead < z && t2 === l) return A;
              if (0 === e2.lookahead) break;
            }
            if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 !== r2 && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2)), e2.match_length >= x) if (n2 = u._tr_tally(e2, e2.strstart - e2.match_start, e2.match_length - x), e2.lookahead -= e2.match_length, e2.match_length <= e2.max_lazy_match && e2.lookahead >= x) {
              for (e2.match_length--; e2.strstart++, e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart, 0 != --e2.match_length; ) ;
              e2.strstart++;
            } else e2.strstart += e2.match_length, e2.match_length = 0, e2.ins_h = e2.window[e2.strstart], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + 1]) & e2.hash_mask;
            else n2 = u._tr_tally(e2, 0, e2.window[e2.strstart]), e2.lookahead--, e2.strstart++;
            if (n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
          }
          return e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
        }
        function W(e2, t2) {
          for (var r2, n2, i2; ; ) {
            if (e2.lookahead < z) {
              if (j(e2), e2.lookahead < z && t2 === l) return A;
              if (0 === e2.lookahead) break;
            }
            if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), e2.prev_length = e2.match_length, e2.prev_match = e2.match_start, e2.match_length = x - 1, 0 !== r2 && e2.prev_length < e2.max_lazy_match && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2), e2.match_length <= 5 && (1 === e2.strategy || e2.match_length === x && 4096 < e2.strstart - e2.match_start) && (e2.match_length = x - 1)), e2.prev_length >= x && e2.match_length <= e2.prev_length) {
              for (i2 = e2.strstart + e2.lookahead - x, n2 = u._tr_tally(e2, e2.strstart - 1 - e2.prev_match, e2.prev_length - x), e2.lookahead -= e2.prev_length - 1, e2.prev_length -= 2; ++e2.strstart <= i2 && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 != --e2.prev_length; ) ;
              if (e2.match_available = 0, e2.match_length = x - 1, e2.strstart++, n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
            } else if (e2.match_available) {
              if ((n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1])) && N(e2, false), e2.strstart++, e2.lookahead--, 0 === e2.strm.avail_out) return A;
            } else e2.match_available = 1, e2.strstart++, e2.lookahead--;
          }
          return e2.match_available && (n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1]), e2.match_available = 0), e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
        }
        function M(e2, t2, r2, n2, i2) {
          this.good_length = e2, this.max_lazy = t2, this.nice_length = r2, this.max_chain = n2, this.func = i2;
        }
        function H() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = v, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new c.Buf16(2 * w), this.dyn_dtree = new c.Buf16(2 * (2 * a + 1)), this.bl_tree = new c.Buf16(2 * (2 * o + 1)), D(this.dyn_ltree), D(this.dyn_dtree), D(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new c.Buf16(k + 1), this.heap = new c.Buf16(2 * s + 1), D(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new c.Buf16(2 * s + 1), D(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function G(e2) {
          var t2;
          return e2 && e2.state ? (e2.total_in = e2.total_out = 0, e2.data_type = i, (t2 = e2.state).pending = 0, t2.pending_out = 0, t2.wrap < 0 && (t2.wrap = -t2.wrap), t2.status = t2.wrap ? C : E, e2.adler = 2 === t2.wrap ? 0 : 1, t2.last_flush = l, u._tr_init(t2), m) : R(e2, _);
        }
        function K(e2) {
          var t2 = G(e2);
          return t2 === m && (function(e3) {
            e3.window_size = 2 * e3.w_size, D(e3.head), e3.max_lazy_match = h[e3.level].max_lazy, e3.good_match = h[e3.level].good_length, e3.nice_match = h[e3.level].nice_length, e3.max_chain_length = h[e3.level].max_chain, e3.strstart = 0, e3.block_start = 0, e3.lookahead = 0, e3.insert = 0, e3.match_length = e3.prev_length = x - 1, e3.match_available = 0, e3.ins_h = 0;
          })(e2.state), t2;
        }
        function Y(e2, t2, r2, n2, i2, s2) {
          if (!e2) return _;
          var a2 = 1;
          if (t2 === g && (t2 = 6), n2 < 0 ? (a2 = 0, n2 = -n2) : 15 < n2 && (a2 = 2, n2 -= 16), i2 < 1 || y < i2 || r2 !== v || n2 < 8 || 15 < n2 || t2 < 0 || 9 < t2 || s2 < 0 || b < s2) return R(e2, _);
          8 === n2 && (n2 = 9);
          var o2 = new H();
          return (e2.state = o2).strm = e2, o2.wrap = a2, o2.gzhead = null, o2.w_bits = n2, o2.w_size = 1 << o2.w_bits, o2.w_mask = o2.w_size - 1, o2.hash_bits = i2 + 7, o2.hash_size = 1 << o2.hash_bits, o2.hash_mask = o2.hash_size - 1, o2.hash_shift = ~~((o2.hash_bits + x - 1) / x), o2.window = new c.Buf8(2 * o2.w_size), o2.head = new c.Buf16(o2.hash_size), o2.prev = new c.Buf16(o2.w_size), o2.lit_bufsize = 1 << i2 + 6, o2.pending_buf_size = 4 * o2.lit_bufsize, o2.pending_buf = new c.Buf8(o2.pending_buf_size), o2.d_buf = 1 * o2.lit_bufsize, o2.l_buf = 3 * o2.lit_bufsize, o2.level = t2, o2.strategy = s2, o2.method = r2, K(e2);
        }
        h = [new M(0, 0, 0, 0, function(e2, t2) {
          var r2 = 65535;
          for (r2 > e2.pending_buf_size - 5 && (r2 = e2.pending_buf_size - 5); ; ) {
            if (e2.lookahead <= 1) {
              if (j(e2), 0 === e2.lookahead && t2 === l) return A;
              if (0 === e2.lookahead) break;
            }
            e2.strstart += e2.lookahead, e2.lookahead = 0;
            var n2 = e2.block_start + r2;
            if ((0 === e2.strstart || e2.strstart >= n2) && (e2.lookahead = e2.strstart - n2, e2.strstart = n2, N(e2, false), 0 === e2.strm.avail_out)) return A;
            if (e2.strstart - e2.block_start >= e2.w_size - z && (N(e2, false), 0 === e2.strm.avail_out)) return A;
          }
          return e2.insert = 0, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : (e2.strstart > e2.block_start && (N(e2, false), e2.strm.avail_out), A);
        }), new M(4, 4, 8, 4, Z), new M(4, 5, 16, 8, Z), new M(4, 6, 32, 32, Z), new M(4, 4, 16, 16, W), new M(8, 16, 32, 32, W), new M(8, 16, 128, 128, W), new M(8, 32, 128, 256, W), new M(32, 128, 258, 1024, W), new M(32, 258, 258, 4096, W)], r.deflateInit = function(e2, t2) {
          return Y(e2, t2, v, 15, 8, 0);
        }, r.deflateInit2 = Y, r.deflateReset = K, r.deflateResetKeep = G, r.deflateSetHeader = function(e2, t2) {
          return e2 && e2.state ? 2 !== e2.state.wrap ? _ : (e2.state.gzhead = t2, m) : _;
        }, r.deflate = function(e2, t2) {
          var r2, n2, i2, s2;
          if (!e2 || !e2.state || 5 < t2 || t2 < 0) return e2 ? R(e2, _) : _;
          if (n2 = e2.state, !e2.output || !e2.input && 0 !== e2.avail_in || 666 === n2.status && t2 !== f) return R(e2, 0 === e2.avail_out ? -5 : _);
          if (n2.strm = e2, r2 = n2.last_flush, n2.last_flush = t2, n2.status === C) if (2 === n2.wrap) e2.adler = 0, U(n2, 31), U(n2, 139), U(n2, 8), n2.gzhead ? (U(n2, (n2.gzhead.text ? 1 : 0) + (n2.gzhead.hcrc ? 2 : 0) + (n2.gzhead.extra ? 4 : 0) + (n2.gzhead.name ? 8 : 0) + (n2.gzhead.comment ? 16 : 0)), U(n2, 255 & n2.gzhead.time), U(n2, n2.gzhead.time >> 8 & 255), U(n2, n2.gzhead.time >> 16 & 255), U(n2, n2.gzhead.time >> 24 & 255), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 255 & n2.gzhead.os), n2.gzhead.extra && n2.gzhead.extra.length && (U(n2, 255 & n2.gzhead.extra.length), U(n2, n2.gzhead.extra.length >> 8 & 255)), n2.gzhead.hcrc && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending, 0)), n2.gzindex = 0, n2.status = 69) : (U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 3), n2.status = E);
          else {
            var a2 = v + (n2.w_bits - 8 << 4) << 8;
            a2 |= (2 <= n2.strategy || n2.level < 2 ? 0 : n2.level < 6 ? 1 : 6 === n2.level ? 2 : 3) << 6, 0 !== n2.strstart && (a2 |= 32), a2 += 31 - a2 % 31, n2.status = E, P(n2, a2), 0 !== n2.strstart && (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), e2.adler = 1;
          }
          if (69 === n2.status) if (n2.gzhead.extra) {
            for (i2 = n2.pending; n2.gzindex < (65535 & n2.gzhead.extra.length) && (n2.pending !== n2.pending_buf_size || (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending !== n2.pending_buf_size)); ) U(n2, 255 & n2.gzhead.extra[n2.gzindex]), n2.gzindex++;
            n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), n2.gzindex === n2.gzhead.extra.length && (n2.gzindex = 0, n2.status = 73);
          } else n2.status = 73;
          if (73 === n2.status) if (n2.gzhead.name) {
            i2 = n2.pending;
            do {
              if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                s2 = 1;
                break;
              }
              s2 = n2.gzindex < n2.gzhead.name.length ? 255 & n2.gzhead.name.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
            } while (0 !== s2);
            n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.gzindex = 0, n2.status = 91);
          } else n2.status = 91;
          if (91 === n2.status) if (n2.gzhead.comment) {
            i2 = n2.pending;
            do {
              if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                s2 = 1;
                break;
              }
              s2 = n2.gzindex < n2.gzhead.comment.length ? 255 & n2.gzhead.comment.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
            } while (0 !== s2);
            n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.status = 103);
          } else n2.status = 103;
          if (103 === n2.status && (n2.gzhead.hcrc ? (n2.pending + 2 > n2.pending_buf_size && F(e2), n2.pending + 2 <= n2.pending_buf_size && (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), e2.adler = 0, n2.status = E)) : n2.status = E), 0 !== n2.pending) {
            if (F(e2), 0 === e2.avail_out) return n2.last_flush = -1, m;
          } else if (0 === e2.avail_in && T(t2) <= T(r2) && t2 !== f) return R(e2, -5);
          if (666 === n2.status && 0 !== e2.avail_in) return R(e2, -5);
          if (0 !== e2.avail_in || 0 !== n2.lookahead || t2 !== l && 666 !== n2.status) {
            var o2 = 2 === n2.strategy ? (function(e3, t3) {
              for (var r3; ; ) {
                if (0 === e3.lookahead && (j(e3), 0 === e3.lookahead)) {
                  if (t3 === l) return A;
                  break;
                }
                if (e3.match_length = 0, r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++, r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
              }
              return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
            })(n2, t2) : 3 === n2.strategy ? (function(e3, t3) {
              for (var r3, n3, i3, s3, a3 = e3.window; ; ) {
                if (e3.lookahead <= S) {
                  if (j(e3), e3.lookahead <= S && t3 === l) return A;
                  if (0 === e3.lookahead) break;
                }
                if (e3.match_length = 0, e3.lookahead >= x && 0 < e3.strstart && (n3 = a3[i3 = e3.strstart - 1]) === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3]) {
                  s3 = e3.strstart + S;
                  do {
                  } while (n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && i3 < s3);
                  e3.match_length = S - (s3 - i3), e3.match_length > e3.lookahead && (e3.match_length = e3.lookahead);
                }
                if (e3.match_length >= x ? (r3 = u._tr_tally(e3, 1, e3.match_length - x), e3.lookahead -= e3.match_length, e3.strstart += e3.match_length, e3.match_length = 0) : (r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++), r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
              }
              return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
            })(n2, t2) : h[n2.level].func(n2, t2);
            if (o2 !== O && o2 !== B || (n2.status = 666), o2 === A || o2 === O) return 0 === e2.avail_out && (n2.last_flush = -1), m;
            if (o2 === I && (1 === t2 ? u._tr_align(n2) : 5 !== t2 && (u._tr_stored_block(n2, 0, 0, false), 3 === t2 && (D(n2.head), 0 === n2.lookahead && (n2.strstart = 0, n2.block_start = 0, n2.insert = 0))), F(e2), 0 === e2.avail_out)) return n2.last_flush = -1, m;
          }
          return t2 !== f ? m : n2.wrap <= 0 ? 1 : (2 === n2.wrap ? (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), U(n2, e2.adler >> 16 & 255), U(n2, e2.adler >> 24 & 255), U(n2, 255 & e2.total_in), U(n2, e2.total_in >> 8 & 255), U(n2, e2.total_in >> 16 & 255), U(n2, e2.total_in >> 24 & 255)) : (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), F(e2), 0 < n2.wrap && (n2.wrap = -n2.wrap), 0 !== n2.pending ? m : 1);
        }, r.deflateEnd = function(e2) {
          var t2;
          return e2 && e2.state ? (t2 = e2.state.status) !== C && 69 !== t2 && 73 !== t2 && 91 !== t2 && 103 !== t2 && t2 !== E && 666 !== t2 ? R(e2, _) : (e2.state = null, t2 === E ? R(e2, -3) : m) : _;
        }, r.deflateSetDictionary = function(e2, t2) {
          var r2, n2, i2, s2, a2, o2, h2, u2, l2 = t2.length;
          if (!e2 || !e2.state) return _;
          if (2 === (s2 = (r2 = e2.state).wrap) || 1 === s2 && r2.status !== C || r2.lookahead) return _;
          for (1 === s2 && (e2.adler = d(e2.adler, t2, l2, 0)), r2.wrap = 0, l2 >= r2.w_size && (0 === s2 && (D(r2.head), r2.strstart = 0, r2.block_start = 0, r2.insert = 0), u2 = new c.Buf8(r2.w_size), c.arraySet(u2, t2, l2 - r2.w_size, r2.w_size, 0), t2 = u2, l2 = r2.w_size), a2 = e2.avail_in, o2 = e2.next_in, h2 = e2.input, e2.avail_in = l2, e2.next_in = 0, e2.input = t2, j(r2); r2.lookahead >= x; ) {
            for (n2 = r2.strstart, i2 = r2.lookahead - (x - 1); r2.ins_h = (r2.ins_h << r2.hash_shift ^ r2.window[n2 + x - 1]) & r2.hash_mask, r2.prev[n2 & r2.w_mask] = r2.head[r2.ins_h], r2.head[r2.ins_h] = n2, n2++, --i2; ) ;
            r2.strstart = n2, r2.lookahead = x - 1, j(r2);
          }
          return r2.strstart += r2.lookahead, r2.block_start = r2.strstart, r2.insert = r2.lookahead, r2.lookahead = 0, r2.match_length = r2.prev_length = x - 1, r2.match_available = 0, e2.next_in = o2, e2.input = h2, e2.avail_in = a2, r2.wrap = s2, m;
        }, r.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, t, r) {
        "use strict";
        t.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = false;
        };
      }, {}], 48: [function(e, t, r) {
        "use strict";
        t.exports = function(e2, t2) {
          var r2, n, i, s, a, o, h, u, l, f, c, d, p, m, _, g, b, v, y, w, k, x, S, z, C;
          r2 = e2.state, n = e2.next_in, z = e2.input, i = n + (e2.avail_in - 5), s = e2.next_out, C = e2.output, a = s - (t2 - e2.avail_out), o = s + (e2.avail_out - 257), h = r2.dmax, u = r2.wsize, l = r2.whave, f = r2.wnext, c = r2.window, d = r2.hold, p = r2.bits, m = r2.lencode, _ = r2.distcode, g = (1 << r2.lenbits) - 1, b = (1 << r2.distbits) - 1;
          e: do {
            p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = m[d & g];
            t: for (; ; ) {
              if (d >>>= y = v >>> 24, p -= y, 0 === (y = v >>> 16 & 255)) C[s++] = 65535 & v;
              else {
                if (!(16 & y)) {
                  if (0 == (64 & y)) {
                    v = m[(65535 & v) + (d & (1 << y) - 1)];
                    continue t;
                  }
                  if (32 & y) {
                    r2.mode = 12;
                    break e;
                  }
                  e2.msg = "invalid literal/length code", r2.mode = 30;
                  break e;
                }
                w = 65535 & v, (y &= 15) && (p < y && (d += z[n++] << p, p += 8), w += d & (1 << y) - 1, d >>>= y, p -= y), p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = _[d & b];
                r: for (; ; ) {
                  if (d >>>= y = v >>> 24, p -= y, !(16 & (y = v >>> 16 & 255))) {
                    if (0 == (64 & y)) {
                      v = _[(65535 & v) + (d & (1 << y) - 1)];
                      continue r;
                    }
                    e2.msg = "invalid distance code", r2.mode = 30;
                    break e;
                  }
                  if (k = 65535 & v, p < (y &= 15) && (d += z[n++] << p, (p += 8) < y && (d += z[n++] << p, p += 8)), h < (k += d & (1 << y) - 1)) {
                    e2.msg = "invalid distance too far back", r2.mode = 30;
                    break e;
                  }
                  if (d >>>= y, p -= y, (y = s - a) < k) {
                    if (l < (y = k - y) && r2.sane) {
                      e2.msg = "invalid distance too far back", r2.mode = 30;
                      break e;
                    }
                    if (S = c, (x = 0) === f) {
                      if (x += u - y, y < w) {
                        for (w -= y; C[s++] = c[x++], --y; ) ;
                        x = s - k, S = C;
                      }
                    } else if (f < y) {
                      if (x += u + f - y, (y -= f) < w) {
                        for (w -= y; C[s++] = c[x++], --y; ) ;
                        if (x = 0, f < w) {
                          for (w -= y = f; C[s++] = c[x++], --y; ) ;
                          x = s - k, S = C;
                        }
                      }
                    } else if (x += f - y, y < w) {
                      for (w -= y; C[s++] = c[x++], --y; ) ;
                      x = s - k, S = C;
                    }
                    for (; 2 < w; ) C[s++] = S[x++], C[s++] = S[x++], C[s++] = S[x++], w -= 3;
                    w && (C[s++] = S[x++], 1 < w && (C[s++] = S[x++]));
                  } else {
                    for (x = s - k; C[s++] = C[x++], C[s++] = C[x++], C[s++] = C[x++], 2 < (w -= 3); ) ;
                    w && (C[s++] = C[x++], 1 < w && (C[s++] = C[x++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (n < i && s < o);
          n -= w = p >> 3, d &= (1 << (p -= w << 3)) - 1, e2.next_in = n, e2.next_out = s, e2.avail_in = n < i ? i - n + 5 : 5 - (n - i), e2.avail_out = s < o ? o - s + 257 : 257 - (s - o), r2.hold = d, r2.bits = p;
        };
      }, {}], 49: [function(e, t, r) {
        "use strict";
        var I = e("../utils/common"), O = e("./adler32"), B = e("./crc32"), R = e("./inffast"), T = e("./inftrees"), D = 1, F = 2, N = 0, U = -2, P = 1, n = 852, i = 592;
        function L(e2) {
          return (e2 >>> 24 & 255) + (e2 >>> 8 & 65280) + ((65280 & e2) << 8) + ((255 & e2) << 24);
        }
        function s() {
          this.mode = 0, this.last = false, this.wrap = 0, this.havedict = false, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new I.Buf16(320), this.work = new I.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function a(e2) {
          var t2;
          return e2 && e2.state ? (t2 = e2.state, e2.total_in = e2.total_out = t2.total = 0, e2.msg = "", t2.wrap && (e2.adler = 1 & t2.wrap), t2.mode = P, t2.last = 0, t2.havedict = 0, t2.dmax = 32768, t2.head = null, t2.hold = 0, t2.bits = 0, t2.lencode = t2.lendyn = new I.Buf32(n), t2.distcode = t2.distdyn = new I.Buf32(i), t2.sane = 1, t2.back = -1, N) : U;
        }
        function o(e2) {
          var t2;
          return e2 && e2.state ? ((t2 = e2.state).wsize = 0, t2.whave = 0, t2.wnext = 0, a(e2)) : U;
        }
        function h(e2, t2) {
          var r2, n2;
          return e2 && e2.state ? (n2 = e2.state, t2 < 0 ? (r2 = 0, t2 = -t2) : (r2 = 1 + (t2 >> 4), t2 < 48 && (t2 &= 15)), t2 && (t2 < 8 || 15 < t2) ? U : (null !== n2.window && n2.wbits !== t2 && (n2.window = null), n2.wrap = r2, n2.wbits = t2, o(e2))) : U;
        }
        function u(e2, t2) {
          var r2, n2;
          return e2 ? (n2 = new s(), (e2.state = n2).window = null, (r2 = h(e2, t2)) !== N && (e2.state = null), r2) : U;
        }
        var l, f, c = true;
        function j(e2) {
          if (c) {
            var t2;
            for (l = new I.Buf32(512), f = new I.Buf32(32), t2 = 0; t2 < 144; ) e2.lens[t2++] = 8;
            for (; t2 < 256; ) e2.lens[t2++] = 9;
            for (; t2 < 280; ) e2.lens[t2++] = 7;
            for (; t2 < 288; ) e2.lens[t2++] = 8;
            for (T(D, e2.lens, 0, 288, l, 0, e2.work, { bits: 9 }), t2 = 0; t2 < 32; ) e2.lens[t2++] = 5;
            T(F, e2.lens, 0, 32, f, 0, e2.work, { bits: 5 }), c = false;
          }
          e2.lencode = l, e2.lenbits = 9, e2.distcode = f, e2.distbits = 5;
        }
        function Z(e2, t2, r2, n2) {
          var i2, s2 = e2.state;
          return null === s2.window && (s2.wsize = 1 << s2.wbits, s2.wnext = 0, s2.whave = 0, s2.window = new I.Buf8(s2.wsize)), n2 >= s2.wsize ? (I.arraySet(s2.window, t2, r2 - s2.wsize, s2.wsize, 0), s2.wnext = 0, s2.whave = s2.wsize) : (n2 < (i2 = s2.wsize - s2.wnext) && (i2 = n2), I.arraySet(s2.window, t2, r2 - n2, i2, s2.wnext), (n2 -= i2) ? (I.arraySet(s2.window, t2, r2 - n2, n2, 0), s2.wnext = n2, s2.whave = s2.wsize) : (s2.wnext += i2, s2.wnext === s2.wsize && (s2.wnext = 0), s2.whave < s2.wsize && (s2.whave += i2))), 0;
        }
        r.inflateReset = o, r.inflateReset2 = h, r.inflateResetKeep = a, r.inflateInit = function(e2) {
          return u(e2, 15);
        }, r.inflateInit2 = u, r.inflate = function(e2, t2) {
          var r2, n2, i2, s2, a2, o2, h2, u2, l2, f2, c2, d, p, m, _, g, b, v, y, w, k, x, S, z, C = 0, E = new I.Buf8(4), A = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!e2 || !e2.state || !e2.output || !e2.input && 0 !== e2.avail_in) return U;
          12 === (r2 = e2.state).mode && (r2.mode = 13), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, f2 = o2, c2 = h2, x = N;
          e: for (; ; ) switch (r2.mode) {
            case P:
              if (0 === r2.wrap) {
                r2.mode = 13;
                break;
              }
              for (; l2 < 16; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (2 & r2.wrap && 35615 === u2) {
                E[r2.check = 0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0), l2 = u2 = 0, r2.mode = 2;
                break;
              }
              if (r2.flags = 0, r2.head && (r2.head.done = false), !(1 & r2.wrap) || (((255 & u2) << 8) + (u2 >> 8)) % 31) {
                e2.msg = "incorrect header check", r2.mode = 30;
                break;
              }
              if (8 != (15 & u2)) {
                e2.msg = "unknown compression method", r2.mode = 30;
                break;
              }
              if (l2 -= 4, k = 8 + (15 & (u2 >>>= 4)), 0 === r2.wbits) r2.wbits = k;
              else if (k > r2.wbits) {
                e2.msg = "invalid window size", r2.mode = 30;
                break;
              }
              r2.dmax = 1 << k, e2.adler = r2.check = 1, r2.mode = 512 & u2 ? 10 : 12, l2 = u2 = 0;
              break;
            case 2:
              for (; l2 < 16; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (r2.flags = u2, 8 != (255 & r2.flags)) {
                e2.msg = "unknown compression method", r2.mode = 30;
                break;
              }
              if (57344 & r2.flags) {
                e2.msg = "unknown header flags set", r2.mode = 30;
                break;
              }
              r2.head && (r2.head.text = u2 >> 8 & 1), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 3;
            case 3:
              for (; l2 < 32; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              r2.head && (r2.head.time = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, E[2] = u2 >>> 16 & 255, E[3] = u2 >>> 24 & 255, r2.check = B(r2.check, E, 4, 0)), l2 = u2 = 0, r2.mode = 4;
            case 4:
              for (; l2 < 16; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              r2.head && (r2.head.xflags = 255 & u2, r2.head.os = u2 >> 8), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 5;
            case 5:
              if (1024 & r2.flags) {
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.length = u2, r2.head && (r2.head.extra_len = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0;
              } else r2.head && (r2.head.extra = null);
              r2.mode = 6;
            case 6:
              if (1024 & r2.flags && (o2 < (d = r2.length) && (d = o2), d && (r2.head && (k = r2.head.extra_len - r2.length, r2.head.extra || (r2.head.extra = new Array(r2.head.extra_len)), I.arraySet(r2.head.extra, n2, s2, d, k)), 512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, r2.length -= d), r2.length)) break e;
              r2.length = 0, r2.mode = 7;
            case 7:
              if (2048 & r2.flags) {
                if (0 === o2) break e;
                for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.name += String.fromCharCode(k)), k && d < o2; ) ;
                if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
              } else r2.head && (r2.head.name = null);
              r2.length = 0, r2.mode = 8;
            case 8:
              if (4096 & r2.flags) {
                if (0 === o2) break e;
                for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.comment += String.fromCharCode(k)), k && d < o2; ) ;
                if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
              } else r2.head && (r2.head.comment = null);
              r2.mode = 9;
            case 9:
              if (512 & r2.flags) {
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (u2 !== (65535 & r2.check)) {
                  e2.msg = "header crc mismatch", r2.mode = 30;
                  break;
                }
                l2 = u2 = 0;
              }
              r2.head && (r2.head.hcrc = r2.flags >> 9 & 1, r2.head.done = true), e2.adler = r2.check = 0, r2.mode = 12;
              break;
            case 10:
              for (; l2 < 32; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              e2.adler = r2.check = L(u2), l2 = u2 = 0, r2.mode = 11;
            case 11:
              if (0 === r2.havedict) return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, 2;
              e2.adler = r2.check = 1, r2.mode = 12;
            case 12:
              if (5 === t2 || 6 === t2) break e;
            case 13:
              if (r2.last) {
                u2 >>>= 7 & l2, l2 -= 7 & l2, r2.mode = 27;
                break;
              }
              for (; l2 < 3; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              switch (r2.last = 1 & u2, l2 -= 1, 3 & (u2 >>>= 1)) {
                case 0:
                  r2.mode = 14;
                  break;
                case 1:
                  if (j(r2), r2.mode = 20, 6 !== t2) break;
                  u2 >>>= 2, l2 -= 2;
                  break e;
                case 2:
                  r2.mode = 17;
                  break;
                case 3:
                  e2.msg = "invalid block type", r2.mode = 30;
              }
              u2 >>>= 2, l2 -= 2;
              break;
            case 14:
              for (u2 >>>= 7 & l2, l2 -= 7 & l2; l2 < 32; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if ((65535 & u2) != (u2 >>> 16 ^ 65535)) {
                e2.msg = "invalid stored block lengths", r2.mode = 30;
                break;
              }
              if (r2.length = 65535 & u2, l2 = u2 = 0, r2.mode = 15, 6 === t2) break e;
            case 15:
              r2.mode = 16;
            case 16:
              if (d = r2.length) {
                if (o2 < d && (d = o2), h2 < d && (d = h2), 0 === d) break e;
                I.arraySet(i2, n2, s2, d, a2), o2 -= d, s2 += d, h2 -= d, a2 += d, r2.length -= d;
                break;
              }
              r2.mode = 12;
              break;
            case 17:
              for (; l2 < 14; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (r2.nlen = 257 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ndist = 1 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ncode = 4 + (15 & u2), u2 >>>= 4, l2 -= 4, 286 < r2.nlen || 30 < r2.ndist) {
                e2.msg = "too many length or distance symbols", r2.mode = 30;
                break;
              }
              r2.have = 0, r2.mode = 18;
            case 18:
              for (; r2.have < r2.ncode; ) {
                for (; l2 < 3; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.lens[A[r2.have++]] = 7 & u2, u2 >>>= 3, l2 -= 3;
              }
              for (; r2.have < 19; ) r2.lens[A[r2.have++]] = 0;
              if (r2.lencode = r2.lendyn, r2.lenbits = 7, S = { bits: r2.lenbits }, x = T(0, r2.lens, 0, 19, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                e2.msg = "invalid code lengths set", r2.mode = 30;
                break;
              }
              r2.have = 0, r2.mode = 19;
            case 19:
              for (; r2.have < r2.nlen + r2.ndist; ) {
                for (; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (b < 16) u2 >>>= _, l2 -= _, r2.lens[r2.have++] = b;
                else {
                  if (16 === b) {
                    for (z = _ + 2; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    if (u2 >>>= _, l2 -= _, 0 === r2.have) {
                      e2.msg = "invalid bit length repeat", r2.mode = 30;
                      break;
                    }
                    k = r2.lens[r2.have - 1], d = 3 + (3 & u2), u2 >>>= 2, l2 -= 2;
                  } else if (17 === b) {
                    for (z = _ + 3; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    l2 -= _, k = 0, d = 3 + (7 & (u2 >>>= _)), u2 >>>= 3, l2 -= 3;
                  } else {
                    for (z = _ + 7; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    l2 -= _, k = 0, d = 11 + (127 & (u2 >>>= _)), u2 >>>= 7, l2 -= 7;
                  }
                  if (r2.have + d > r2.nlen + r2.ndist) {
                    e2.msg = "invalid bit length repeat", r2.mode = 30;
                    break;
                  }
                  for (; d--; ) r2.lens[r2.have++] = k;
                }
              }
              if (30 === r2.mode) break;
              if (0 === r2.lens[256]) {
                e2.msg = "invalid code -- missing end-of-block", r2.mode = 30;
                break;
              }
              if (r2.lenbits = 9, S = { bits: r2.lenbits }, x = T(D, r2.lens, 0, r2.nlen, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                e2.msg = "invalid literal/lengths set", r2.mode = 30;
                break;
              }
              if (r2.distbits = 6, r2.distcode = r2.distdyn, S = { bits: r2.distbits }, x = T(F, r2.lens, r2.nlen, r2.ndist, r2.distcode, 0, r2.work, S), r2.distbits = S.bits, x) {
                e2.msg = "invalid distances set", r2.mode = 30;
                break;
              }
              if (r2.mode = 20, 6 === t2) break e;
            case 20:
              r2.mode = 21;
            case 21:
              if (6 <= o2 && 258 <= h2) {
                e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, R(e2, c2), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, 12 === r2.mode && (r2.back = -1);
                break;
              }
              for (r2.back = 0; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (g && 0 == (240 & g)) {
                for (v = _, y = g, w = b; g = (C = r2.lencode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                u2 >>>= v, l2 -= v, r2.back += v;
              }
              if (u2 >>>= _, l2 -= _, r2.back += _, r2.length = b, 0 === g) {
                r2.mode = 26;
                break;
              }
              if (32 & g) {
                r2.back = -1, r2.mode = 12;
                break;
              }
              if (64 & g) {
                e2.msg = "invalid literal/length code", r2.mode = 30;
                break;
              }
              r2.extra = 15 & g, r2.mode = 22;
            case 22:
              if (r2.extra) {
                for (z = r2.extra; l2 < z; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.length += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
              }
              r2.was = r2.length, r2.mode = 23;
            case 23:
              for (; g = (C = r2.distcode[u2 & (1 << r2.distbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (0 == (240 & g)) {
                for (v = _, y = g, w = b; g = (C = r2.distcode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                u2 >>>= v, l2 -= v, r2.back += v;
              }
              if (u2 >>>= _, l2 -= _, r2.back += _, 64 & g) {
                e2.msg = "invalid distance code", r2.mode = 30;
                break;
              }
              r2.offset = b, r2.extra = 15 & g, r2.mode = 24;
            case 24:
              if (r2.extra) {
                for (z = r2.extra; l2 < z; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.offset += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
              }
              if (r2.offset > r2.dmax) {
                e2.msg = "invalid distance too far back", r2.mode = 30;
                break;
              }
              r2.mode = 25;
            case 25:
              if (0 === h2) break e;
              if (d = c2 - h2, r2.offset > d) {
                if ((d = r2.offset - d) > r2.whave && r2.sane) {
                  e2.msg = "invalid distance too far back", r2.mode = 30;
                  break;
                }
                p = d > r2.wnext ? (d -= r2.wnext, r2.wsize - d) : r2.wnext - d, d > r2.length && (d = r2.length), m = r2.window;
              } else m = i2, p = a2 - r2.offset, d = r2.length;
              for (h2 < d && (d = h2), h2 -= d, r2.length -= d; i2[a2++] = m[p++], --d; ) ;
              0 === r2.length && (r2.mode = 21);
              break;
            case 26:
              if (0 === h2) break e;
              i2[a2++] = r2.length, h2--, r2.mode = 21;
              break;
            case 27:
              if (r2.wrap) {
                for (; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 |= n2[s2++] << l2, l2 += 8;
                }
                if (c2 -= h2, e2.total_out += c2, r2.total += c2, c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, a2 - c2) : O(r2.check, i2, c2, a2 - c2)), c2 = h2, (r2.flags ? u2 : L(u2)) !== r2.check) {
                  e2.msg = "incorrect data check", r2.mode = 30;
                  break;
                }
                l2 = u2 = 0;
              }
              r2.mode = 28;
            case 28:
              if (r2.wrap && r2.flags) {
                for (; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (u2 !== (4294967295 & r2.total)) {
                  e2.msg = "incorrect length check", r2.mode = 30;
                  break;
                }
                l2 = u2 = 0;
              }
              r2.mode = 29;
            case 29:
              x = 1;
              break e;
            case 30:
              x = -3;
              break e;
            case 31:
              return -4;
            case 32:
            default:
              return U;
          }
          return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, (r2.wsize || c2 !== e2.avail_out && r2.mode < 30 && (r2.mode < 27 || 4 !== t2)) && Z(e2, e2.output, e2.next_out, c2 - e2.avail_out) ? (r2.mode = 31, -4) : (f2 -= e2.avail_in, c2 -= e2.avail_out, e2.total_in += f2, e2.total_out += c2, r2.total += c2, r2.wrap && c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, e2.next_out - c2) : O(r2.check, i2, c2, e2.next_out - c2)), e2.data_type = r2.bits + (r2.last ? 64 : 0) + (12 === r2.mode ? 128 : 0) + (20 === r2.mode || 15 === r2.mode ? 256 : 0), (0 == f2 && 0 === c2 || 4 === t2) && x === N && (x = -5), x);
        }, r.inflateEnd = function(e2) {
          if (!e2 || !e2.state) return U;
          var t2 = e2.state;
          return t2.window && (t2.window = null), e2.state = null, N;
        }, r.inflateGetHeader = function(e2, t2) {
          var r2;
          return e2 && e2.state ? 0 == (2 & (r2 = e2.state).wrap) ? U : ((r2.head = t2).done = false, N) : U;
        }, r.inflateSetDictionary = function(e2, t2) {
          var r2, n2 = t2.length;
          return e2 && e2.state ? 0 !== (r2 = e2.state).wrap && 11 !== r2.mode ? U : 11 === r2.mode && O(1, t2, n2, 0) !== r2.check ? -3 : Z(e2, t2, n2, n2) ? (r2.mode = 31, -4) : (r2.havedict = 1, N) : U;
        }, r.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, t, r) {
        "use strict";
        var D = e("../utils/common"), F = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], N = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], U = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], P = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        t.exports = function(e2, t2, r2, n, i, s, a, o) {
          var h, u, l, f, c, d, p, m, _, g = o.bits, b = 0, v = 0, y = 0, w = 0, k = 0, x = 0, S = 0, z = 0, C = 0, E = 0, A = null, I = 0, O = new D.Buf16(16), B = new D.Buf16(16), R = null, T = 0;
          for (b = 0; b <= 15; b++) O[b] = 0;
          for (v = 0; v < n; v++) O[t2[r2 + v]]++;
          for (k = g, w = 15; 1 <= w && 0 === O[w]; w--) ;
          if (w < k && (k = w), 0 === w) return i[s++] = 20971520, i[s++] = 20971520, o.bits = 1, 0;
          for (y = 1; y < w && 0 === O[y]; y++) ;
          for (k < y && (k = y), b = z = 1; b <= 15; b++) if (z <<= 1, (z -= O[b]) < 0) return -1;
          if (0 < z && (0 === e2 || 1 !== w)) return -1;
          for (B[1] = 0, b = 1; b < 15; b++) B[b + 1] = B[b] + O[b];
          for (v = 0; v < n; v++) 0 !== t2[r2 + v] && (a[B[t2[r2 + v]]++] = v);
          if (d = 0 === e2 ? (A = R = a, 19) : 1 === e2 ? (A = F, I -= 257, R = N, T -= 257, 256) : (A = U, R = P, -1), b = y, c = s, S = v = E = 0, l = -1, f = (C = 1 << (x = k)) - 1, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
          for (; ; ) {
            for (p = b - S, _ = a[v] < d ? (m = 0, a[v]) : a[v] > d ? (m = R[T + a[v]], A[I + a[v]]) : (m = 96, 0), h = 1 << b - S, y = u = 1 << x; i[c + (E >> S) + (u -= h)] = p << 24 | m << 16 | _ | 0, 0 !== u; ) ;
            for (h = 1 << b - 1; E & h; ) h >>= 1;
            if (0 !== h ? (E &= h - 1, E += h) : E = 0, v++, 0 == --O[b]) {
              if (b === w) break;
              b = t2[r2 + a[v]];
            }
            if (k < b && (E & f) !== l) {
              for (0 === S && (S = k), c += y, z = 1 << (x = b - S); x + S < w && !((z -= O[x + S]) <= 0); ) x++, z <<= 1;
              if (C += 1 << x, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
              i[l = E & f] = k << 24 | x << 16 | c - s | 0;
            }
          }
          return 0 !== E && (i[c + E] = b - S << 24 | 64 << 16 | 0), o.bits = k, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(e, t, r) {
        "use strict";
        t.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(e, t, r) {
        "use strict";
        var i = e("../utils/common"), o = 0, h = 1;
        function n(e2) {
          for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
        }
        var s = 0, a = 29, u = 256, l = u + 1 + a, f = 30, c = 19, _ = 2 * l + 1, g = 15, d = 16, p = 7, m = 256, b = 16, v = 17, y = 18, w = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], k = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], S = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], z = new Array(2 * (l + 2));
        n(z);
        var C = new Array(2 * f);
        n(C);
        var E = new Array(512);
        n(E);
        var A = new Array(256);
        n(A);
        var I = new Array(a);
        n(I);
        var O, B, R, T = new Array(f);
        function D(e2, t2, r2, n2, i2) {
          this.static_tree = e2, this.extra_bits = t2, this.extra_base = r2, this.elems = n2, this.max_length = i2, this.has_stree = e2 && e2.length;
        }
        function F(e2, t2) {
          this.dyn_tree = e2, this.max_code = 0, this.stat_desc = t2;
        }
        function N(e2) {
          return e2 < 256 ? E[e2] : E[256 + (e2 >>> 7)];
        }
        function U(e2, t2) {
          e2.pending_buf[e2.pending++] = 255 & t2, e2.pending_buf[e2.pending++] = t2 >>> 8 & 255;
        }
        function P(e2, t2, r2) {
          e2.bi_valid > d - r2 ? (e2.bi_buf |= t2 << e2.bi_valid & 65535, U(e2, e2.bi_buf), e2.bi_buf = t2 >> d - e2.bi_valid, e2.bi_valid += r2 - d) : (e2.bi_buf |= t2 << e2.bi_valid & 65535, e2.bi_valid += r2);
        }
        function L(e2, t2, r2) {
          P(e2, r2[2 * t2], r2[2 * t2 + 1]);
        }
        function j(e2, t2) {
          for (var r2 = 0; r2 |= 1 & e2, e2 >>>= 1, r2 <<= 1, 0 < --t2; ) ;
          return r2 >>> 1;
        }
        function Z(e2, t2, r2) {
          var n2, i2, s2 = new Array(g + 1), a2 = 0;
          for (n2 = 1; n2 <= g; n2++) s2[n2] = a2 = a2 + r2[n2 - 1] << 1;
          for (i2 = 0; i2 <= t2; i2++) {
            var o2 = e2[2 * i2 + 1];
            0 !== o2 && (e2[2 * i2] = j(s2[o2]++, o2));
          }
        }
        function W(e2) {
          var t2;
          for (t2 = 0; t2 < l; t2++) e2.dyn_ltree[2 * t2] = 0;
          for (t2 = 0; t2 < f; t2++) e2.dyn_dtree[2 * t2] = 0;
          for (t2 = 0; t2 < c; t2++) e2.bl_tree[2 * t2] = 0;
          e2.dyn_ltree[2 * m] = 1, e2.opt_len = e2.static_len = 0, e2.last_lit = e2.matches = 0;
        }
        function M(e2) {
          8 < e2.bi_valid ? U(e2, e2.bi_buf) : 0 < e2.bi_valid && (e2.pending_buf[e2.pending++] = e2.bi_buf), e2.bi_buf = 0, e2.bi_valid = 0;
        }
        function H(e2, t2, r2, n2) {
          var i2 = 2 * t2, s2 = 2 * r2;
          return e2[i2] < e2[s2] || e2[i2] === e2[s2] && n2[t2] <= n2[r2];
        }
        function G(e2, t2, r2) {
          for (var n2 = e2.heap[r2], i2 = r2 << 1; i2 <= e2.heap_len && (i2 < e2.heap_len && H(t2, e2.heap[i2 + 1], e2.heap[i2], e2.depth) && i2++, !H(t2, n2, e2.heap[i2], e2.depth)); ) e2.heap[r2] = e2.heap[i2], r2 = i2, i2 <<= 1;
          e2.heap[r2] = n2;
        }
        function K(e2, t2, r2) {
          var n2, i2, s2, a2, o2 = 0;
          if (0 !== e2.last_lit) for (; n2 = e2.pending_buf[e2.d_buf + 2 * o2] << 8 | e2.pending_buf[e2.d_buf + 2 * o2 + 1], i2 = e2.pending_buf[e2.l_buf + o2], o2++, 0 === n2 ? L(e2, i2, t2) : (L(e2, (s2 = A[i2]) + u + 1, t2), 0 !== (a2 = w[s2]) && P(e2, i2 -= I[s2], a2), L(e2, s2 = N(--n2), r2), 0 !== (a2 = k[s2]) && P(e2, n2 -= T[s2], a2)), o2 < e2.last_lit; ) ;
          L(e2, m, t2);
        }
        function Y(e2, t2) {
          var r2, n2, i2, s2 = t2.dyn_tree, a2 = t2.stat_desc.static_tree, o2 = t2.stat_desc.has_stree, h2 = t2.stat_desc.elems, u2 = -1;
          for (e2.heap_len = 0, e2.heap_max = _, r2 = 0; r2 < h2; r2++) 0 !== s2[2 * r2] ? (e2.heap[++e2.heap_len] = u2 = r2, e2.depth[r2] = 0) : s2[2 * r2 + 1] = 0;
          for (; e2.heap_len < 2; ) s2[2 * (i2 = e2.heap[++e2.heap_len] = u2 < 2 ? ++u2 : 0)] = 1, e2.depth[i2] = 0, e2.opt_len--, o2 && (e2.static_len -= a2[2 * i2 + 1]);
          for (t2.max_code = u2, r2 = e2.heap_len >> 1; 1 <= r2; r2--) G(e2, s2, r2);
          for (i2 = h2; r2 = e2.heap[1], e2.heap[1] = e2.heap[e2.heap_len--], G(e2, s2, 1), n2 = e2.heap[1], e2.heap[--e2.heap_max] = r2, e2.heap[--e2.heap_max] = n2, s2[2 * i2] = s2[2 * r2] + s2[2 * n2], e2.depth[i2] = (e2.depth[r2] >= e2.depth[n2] ? e2.depth[r2] : e2.depth[n2]) + 1, s2[2 * r2 + 1] = s2[2 * n2 + 1] = i2, e2.heap[1] = i2++, G(e2, s2, 1), 2 <= e2.heap_len; ) ;
          e2.heap[--e2.heap_max] = e2.heap[1], (function(e3, t3) {
            var r3, n3, i3, s3, a3, o3, h3 = t3.dyn_tree, u3 = t3.max_code, l2 = t3.stat_desc.static_tree, f2 = t3.stat_desc.has_stree, c2 = t3.stat_desc.extra_bits, d2 = t3.stat_desc.extra_base, p2 = t3.stat_desc.max_length, m2 = 0;
            for (s3 = 0; s3 <= g; s3++) e3.bl_count[s3] = 0;
            for (h3[2 * e3.heap[e3.heap_max] + 1] = 0, r3 = e3.heap_max + 1; r3 < _; r3++) p2 < (s3 = h3[2 * h3[2 * (n3 = e3.heap[r3]) + 1] + 1] + 1) && (s3 = p2, m2++), h3[2 * n3 + 1] = s3, u3 < n3 || (e3.bl_count[s3]++, a3 = 0, d2 <= n3 && (a3 = c2[n3 - d2]), o3 = h3[2 * n3], e3.opt_len += o3 * (s3 + a3), f2 && (e3.static_len += o3 * (l2[2 * n3 + 1] + a3)));
            if (0 !== m2) {
              do {
                for (s3 = p2 - 1; 0 === e3.bl_count[s3]; ) s3--;
                e3.bl_count[s3]--, e3.bl_count[s3 + 1] += 2, e3.bl_count[p2]--, m2 -= 2;
              } while (0 < m2);
              for (s3 = p2; 0 !== s3; s3--) for (n3 = e3.bl_count[s3]; 0 !== n3; ) u3 < (i3 = e3.heap[--r3]) || (h3[2 * i3 + 1] !== s3 && (e3.opt_len += (s3 - h3[2 * i3 + 1]) * h3[2 * i3], h3[2 * i3 + 1] = s3), n3--);
            }
          })(e2, t2), Z(s2, u2, e2.bl_count);
        }
        function X(e2, t2, r2) {
          var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
          for (0 === a2 && (h2 = 138, u2 = 3), t2[2 * (r2 + 1) + 1] = 65535, n2 = 0; n2 <= r2; n2++) i2 = a2, a2 = t2[2 * (n2 + 1) + 1], ++o2 < h2 && i2 === a2 || (o2 < u2 ? e2.bl_tree[2 * i2] += o2 : 0 !== i2 ? (i2 !== s2 && e2.bl_tree[2 * i2]++, e2.bl_tree[2 * b]++) : o2 <= 10 ? e2.bl_tree[2 * v]++ : e2.bl_tree[2 * y]++, s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4));
        }
        function V(e2, t2, r2) {
          var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
          for (0 === a2 && (h2 = 138, u2 = 3), n2 = 0; n2 <= r2; n2++) if (i2 = a2, a2 = t2[2 * (n2 + 1) + 1], !(++o2 < h2 && i2 === a2)) {
            if (o2 < u2) for (; L(e2, i2, e2.bl_tree), 0 != --o2; ) ;
            else 0 !== i2 ? (i2 !== s2 && (L(e2, i2, e2.bl_tree), o2--), L(e2, b, e2.bl_tree), P(e2, o2 - 3, 2)) : o2 <= 10 ? (L(e2, v, e2.bl_tree), P(e2, o2 - 3, 3)) : (L(e2, y, e2.bl_tree), P(e2, o2 - 11, 7));
            s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4);
          }
        }
        n(T);
        var q = false;
        function J(e2, t2, r2, n2) {
          P(e2, (s << 1) + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
            M(e3), n3 && (U(e3, r3), U(e3, ~r3)), i.arraySet(e3.pending_buf, e3.window, t3, r3, e3.pending), e3.pending += r3;
          })(e2, t2, r2, true);
        }
        r._tr_init = function(e2) {
          q || ((function() {
            var e3, t2, r2, n2, i2, s2 = new Array(g + 1);
            for (n2 = r2 = 0; n2 < a - 1; n2++) for (I[n2] = r2, e3 = 0; e3 < 1 << w[n2]; e3++) A[r2++] = n2;
            for (A[r2 - 1] = n2, n2 = i2 = 0; n2 < 16; n2++) for (T[n2] = i2, e3 = 0; e3 < 1 << k[n2]; e3++) E[i2++] = n2;
            for (i2 >>= 7; n2 < f; n2++) for (T[n2] = i2 << 7, e3 = 0; e3 < 1 << k[n2] - 7; e3++) E[256 + i2++] = n2;
            for (t2 = 0; t2 <= g; t2++) s2[t2] = 0;
            for (e3 = 0; e3 <= 143; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
            for (; e3 <= 255; ) z[2 * e3 + 1] = 9, e3++, s2[9]++;
            for (; e3 <= 279; ) z[2 * e3 + 1] = 7, e3++, s2[7]++;
            for (; e3 <= 287; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
            for (Z(z, l + 1, s2), e3 = 0; e3 < f; e3++) C[2 * e3 + 1] = 5, C[2 * e3] = j(e3, 5);
            O = new D(z, w, u + 1, l, g), B = new D(C, k, 0, f, g), R = new D(new Array(0), x, 0, c, p);
          })(), q = true), e2.l_desc = new F(e2.dyn_ltree, O), e2.d_desc = new F(e2.dyn_dtree, B), e2.bl_desc = new F(e2.bl_tree, R), e2.bi_buf = 0, e2.bi_valid = 0, W(e2);
        }, r._tr_stored_block = J, r._tr_flush_block = function(e2, t2, r2, n2) {
          var i2, s2, a2 = 0;
          0 < e2.level ? (2 === e2.strm.data_type && (e2.strm.data_type = (function(e3) {
            var t3, r3 = 4093624447;
            for (t3 = 0; t3 <= 31; t3++, r3 >>>= 1) if (1 & r3 && 0 !== e3.dyn_ltree[2 * t3]) return o;
            if (0 !== e3.dyn_ltree[18] || 0 !== e3.dyn_ltree[20] || 0 !== e3.dyn_ltree[26]) return h;
            for (t3 = 32; t3 < u; t3++) if (0 !== e3.dyn_ltree[2 * t3]) return h;
            return o;
          })(e2)), Y(e2, e2.l_desc), Y(e2, e2.d_desc), a2 = (function(e3) {
            var t3;
            for (X(e3, e3.dyn_ltree, e3.l_desc.max_code), X(e3, e3.dyn_dtree, e3.d_desc.max_code), Y(e3, e3.bl_desc), t3 = c - 1; 3 <= t3 && 0 === e3.bl_tree[2 * S[t3] + 1]; t3--) ;
            return e3.opt_len += 3 * (t3 + 1) + 5 + 5 + 4, t3;
          })(e2), i2 = e2.opt_len + 3 + 7 >>> 3, (s2 = e2.static_len + 3 + 7 >>> 3) <= i2 && (i2 = s2)) : i2 = s2 = r2 + 5, r2 + 4 <= i2 && -1 !== t2 ? J(e2, t2, r2, n2) : 4 === e2.strategy || s2 === i2 ? (P(e2, 2 + (n2 ? 1 : 0), 3), K(e2, z, C)) : (P(e2, 4 + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
            var i3;
            for (P(e3, t3 - 257, 5), P(e3, r3 - 1, 5), P(e3, n3 - 4, 4), i3 = 0; i3 < n3; i3++) P(e3, e3.bl_tree[2 * S[i3] + 1], 3);
            V(e3, e3.dyn_ltree, t3 - 1), V(e3, e3.dyn_dtree, r3 - 1);
          })(e2, e2.l_desc.max_code + 1, e2.d_desc.max_code + 1, a2 + 1), K(e2, e2.dyn_ltree, e2.dyn_dtree)), W(e2), n2 && M(e2);
        }, r._tr_tally = function(e2, t2, r2) {
          return e2.pending_buf[e2.d_buf + 2 * e2.last_lit] = t2 >>> 8 & 255, e2.pending_buf[e2.d_buf + 2 * e2.last_lit + 1] = 255 & t2, e2.pending_buf[e2.l_buf + e2.last_lit] = 255 & r2, e2.last_lit++, 0 === t2 ? e2.dyn_ltree[2 * r2]++ : (e2.matches++, t2--, e2.dyn_ltree[2 * (A[r2] + u + 1)]++, e2.dyn_dtree[2 * N(t2)]++), e2.last_lit === e2.lit_bufsize - 1;
        }, r._tr_align = function(e2) {
          P(e2, 2, 3), L(e2, m, z), (function(e3) {
            16 === e3.bi_valid ? (U(e3, e3.bi_buf), e3.bi_buf = 0, e3.bi_valid = 0) : 8 <= e3.bi_valid && (e3.pending_buf[e3.pending++] = 255 & e3.bi_buf, e3.bi_buf >>= 8, e3.bi_valid -= 8);
          })(e2);
        };
      }, { "../utils/common": 41 }], 53: [function(e, t, r) {
        "use strict";
        t.exports = function() {
          this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
        };
      }, {}], 54: [function(e, t, r) {
        (function(e2) {
          !(function(r2, n) {
            "use strict";
            if (!r2.setImmediate) {
              var i, s, t2, a, o = 1, h = {}, u = false, l = r2.document, e3 = Object.getPrototypeOf && Object.getPrototypeOf(r2);
              e3 = e3 && e3.setTimeout ? e3 : r2, i = "[object process]" === {}.toString.call(r2.process) ? function(e4) {
                process.nextTick(function() {
                  c(e4);
                });
              } : (function() {
                if (r2.postMessage && !r2.importScripts) {
                  var e4 = true, t3 = r2.onmessage;
                  return r2.onmessage = function() {
                    e4 = false;
                  }, r2.postMessage("", "*"), r2.onmessage = t3, e4;
                }
              })() ? (a = "setImmediate$" + Math.random() + "$", r2.addEventListener ? r2.addEventListener("message", d, false) : r2.attachEvent("onmessage", d), function(e4) {
                r2.postMessage(a + e4, "*");
              }) : r2.MessageChannel ? ((t2 = new MessageChannel()).port1.onmessage = function(e4) {
                c(e4.data);
              }, function(e4) {
                t2.port2.postMessage(e4);
              }) : l && "onreadystatechange" in l.createElement("script") ? (s = l.documentElement, function(e4) {
                var t3 = l.createElement("script");
                t3.onreadystatechange = function() {
                  c(e4), t3.onreadystatechange = null, s.removeChild(t3), t3 = null;
                }, s.appendChild(t3);
              }) : function(e4) {
                setTimeout(c, 0, e4);
              }, e3.setImmediate = function(e4) {
                "function" != typeof e4 && (e4 = new Function("" + e4));
                for (var t3 = new Array(arguments.length - 1), r3 = 0; r3 < t3.length; r3++) t3[r3] = arguments[r3 + 1];
                var n2 = { callback: e4, args: t3 };
                return h[o] = n2, i(o), o++;
              }, e3.clearImmediate = f;
            }
            function f(e4) {
              delete h[e4];
            }
            function c(e4) {
              if (u) setTimeout(c, 0, e4);
              else {
                var t3 = h[e4];
                if (t3) {
                  u = true;
                  try {
                    !(function(e5) {
                      var t4 = e5.callback, r3 = e5.args;
                      switch (r3.length) {
                        case 0:
                          t4();
                          break;
                        case 1:
                          t4(r3[0]);
                          break;
                        case 2:
                          t4(r3[0], r3[1]);
                          break;
                        case 3:
                          t4(r3[0], r3[1], r3[2]);
                          break;
                        default:
                          t4.apply(n, r3);
                      }
                    })(t3);
                  } finally {
                    f(e4), u = false;
                  }
                }
              }
            }
            function d(e4) {
              e4.source === r2 && "string" == typeof e4.data && 0 === e4.data.indexOf(a) && c(+e4.data.slice(a.length));
            }
          })("undefined" == typeof self ? void 0 === e2 ? this : e2 : self);
        }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
      }, {}] }, {}, [10])(10);
    });
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
          case REACT_VIEW_TRANSITION_TYPE:
            return "ViewTransition";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var resolveDebugValue = null, rejectDebugValue = null, ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now(), ioInfo.value = new Promise(function(resolve, reject) {
            resolveDebugValue = resolve;
            rejectDebugValue = reject;
          }));
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                if (null != _ioInfo) {
                  _ioInfo.end = performance.now();
                  var debugValue = null == moduleObject ? void 0 : moduleObject.default;
                  resolveDebugValue(debugValue);
                  _ioInfo.value.status = "fulfilled";
                  _ioInfo.value.value = debugValue;
                }
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now(), _ioInfo2.value.then(noop, noop), rejectDebugValue(error), _ioInfo2.value.status = "rejected", _ioInfo2.value.reason = error);
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      function startTransition(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition.types = null !== prevTransition ? prevTransition.types : null;
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      }
      function addTransitionType(type) {
        var transition = ReactSharedInternals.T;
        if (null !== transition) {
          var transitionTypes = transition.types;
          null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
        } else
          0 === ReactSharedInternals.asyncTransitions && console.error(
            "addTransitionType can only be called inside a `startTransition()` callback. It must be associated with a specific Transition."
          ), startTransition(addTransitionType.bind(null, type));
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      var fnName = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports.Activity = REACT_ACTIVITY_TYPE;
      exports.Children = fnName;
      exports.Component = Component;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.__COMPILER_RUNTIME = deprecatedAPIs;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports.addTransitionType = addTransitionType;
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.cacheSignal = function() {
        return null;
      };
      exports.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++)
          validateChildKeys(arguments[i]);
        var propName;
        i = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        (propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++) ? (childArray = Error.stackTraceLimit, Error.stackTraceLimit = 10, childrenLength = Error("react-stack-top-frame"), Error.stackTraceLimit = childArray) : childrenLength = unknownOwnerDebugStack;
        return ReactElement(
          type,
          key,
          i,
          getOwner(),
          childrenLength,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports.isValidElement = isValidElement;
      exports.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports.startTransition = startTransition;
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create, deps);
      };
      exports.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports.useInsertionEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports.useLayoutEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.3.1";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_development();
    }
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    (function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
          case REACT_VIEW_TRANSITION_TYPE:
            return "ViewTransition";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children)
          if (isStaticChildren)
            if (isArrayImpl(children)) {
              for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                validateChildKeys(children[isStaticChildren]);
              Object.freeze && Object.freeze(children);
            } else
              console.error(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(
          type,
          children,
          maybeKey,
          getOwner(),
          debugStack,
          debugTask
        );
      }
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      var React2 = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      React2 = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = React2.react_stack_bottom_frame.bind(
        React2,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutKeySpread = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
          var previousStackTraceLimit = Error.stackTraceLimit;
          Error.stackTraceLimit = 10;
          var debugStackDEV = Error("react-stack-top-frame");
          Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          false,
          debugStackDEV,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.jsxs = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
          var previousStackTraceLimit = Error.stackTraceLimit;
          Error.stackTraceLimit = 10;
          var debugStackDEV = Error("react-stack-top-frame");
          Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          true,
          debugStackDEV,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
    })();
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// src/client/samiReactShim.ts
var getHostReact = () => {
  const w = typeof window !== "undefined" ? window : {};
  if (!w.__SamiReact) {
    throw new Error("Sami host React instance is not initialized yet");
  }
  return w.__SamiReact;
};
var Fragment = Symbol.for("react.fragment");
var useState = (initial) => getHostReact().useState(initial);
var useEffect = (effect, deps) => getHostReact().useEffect(effect, deps);
var useRef = (initial) => getHostReact().useRef(initial);
var useCallback = (cb, deps) => getHostReact().useCallback(cb, deps);

// src/client/samiCloudUpdater.tsx
var import_jszip = __toESM(require_jszip_min(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var SAMI_EXPECTED_APP_ID = "com.sami.tradingchallengetracker";
var SAMI_FALLBACK_VERSION_CODE = 15;
var SAMI_FALLBACK_VERSION_NAME = "1.3.1";
var SHARED_FIRESTORE_LATEST_DOC_URL = "https://firestore.googleapis.com/v1/projects/majestic-interface-ksmzh/databases/ai-studio-c1d1b606-9578-42a6-b7b2-17faaec47f72/documents/app_updates/latest";
function isAndroidLocalAssetOrigin() {
  try {
    return typeof window !== "undefined" && (window.location.hostname === "appassets.androidplatform.net" || window.location.protocol === "file:");
  } catch {
    return false;
  }
}
function sanitizeProductionServerUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed || trimmed === "MY_APP_URL") return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "appassets.androidplatform.net" || host.startsWith("ais-dev-") || host.startsWith("ais-pre-") || host.endsWith(".usercontent.goog")) {
      return "";
    }
    return parsed.origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}
function persistProductionServerUrlLocally(rawUrl) {
  const valid = sanitizeProductionServerUrl(rawUrl);
  if (!valid) return "";
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("sami_push_server_url", valid);
    }
    if (typeof window !== "undefined") {
      const w = window;
      w.__samiConfiguredServerBase = valid;
      if (w.SamiBridge && typeof w.SamiBridge.setRemoteServerUrl === "function") {
        w.SamiBridge.setRemoteServerUrl(valid);
      }
    }
  } catch {
  }
  return valid;
}
function getSamiServerBaseUrl() {
  try {
    if (!isAndroidLocalAssetOrigin()) {
      return "";
    }
    if (typeof window !== "undefined") {
      const w = window;
      const winCached = sanitizeProductionServerUrl(w.__samiConfiguredServerBase);
      if (winCached) return winCached;
    }
    if (typeof localStorage !== "undefined") {
      const rawStored = localStorage.getItem("sami_push_server_url");
      if (rawStored) {
        const cleanStored = sanitizeProductionServerUrl(rawStored);
        if (cleanStored) {
          return cleanStored;
        }
        localStorage.removeItem("sami_push_server_url");
      }
    }
    return "";
  } catch {
    return "";
  }
}
async function discoverCloudStateFromFirestore(parentSignal) {
  const ctrl = new AbortController();
  const onParentAbort = () => ctrl.abort();
  if (parentSignal) {
    if (parentSignal.aborted) return null;
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), 1e4);
  try {
    const res = await fetch(SHARED_FIRESTORE_LATEST_DOC_URL, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const f = json?.fields;
    if (!f || typeof f !== "object") return null;
    const readVal = (v) => {
      if (!v || typeof v !== "object") return void 0;
      if ("stringValue" in v) return v.stringValue;
      if ("booleanValue" in v) return Boolean(v.booleanValue);
      if ("integerValue" in v) return Number(v.integerValue);
      if ("doubleValue" in v) return Number(v.doubleValue);
      return void 0;
    };
    const raw = {};
    for (const k of Object.keys(f)) {
      raw[k] = readVal(f[k]);
    }
    const discoveredServerUrl = persistProductionServerUrlLocally(raw.configuredApiServerUrl);
    const isActive = raw.status === "published" ? raw.isActive !== false && raw.isHidden !== true : raw.isActive === true && raw.isHidden !== true;
    const latestUpdate = {
      id: String(raw.id || "latest"),
      versionName: String(raw.versionName || SAMI_FALLBACK_VERSION_NAME),
      versionCode: Number(raw.versionCode) || SAMI_FALLBACK_VERSION_CODE,
      description: String(raw.description || ""),
      fileSize: raw.fileSize ? Number(raw.fileSize) : void 0,
      fileName: raw.fileName ? String(raw.fileName) : void 0,
      applicationId: raw.applicationId ? String(raw.applicationId) : SAMI_EXPECTED_APP_ID,
      storageSource: raw.storageSource === "github_releases" || Boolean(raw.githubReleaseId) || Boolean(raw.githubAssetId) ? "github_releases" : "legacy",
      githubOwner: raw.githubOwner ? String(raw.githubOwner) : void 0,
      githubRepo: raw.githubRepo ? String(raw.githubRepo) : void 0,
      githubReleaseId: raw.githubReleaseId ? Number(raw.githubReleaseId) : void 0,
      releaseTag: raw.releaseTag ? String(raw.releaseTag) : void 0,
      githubAssetId: raw.githubAssetId ? Number(raw.githubAssetId) : void 0,
      isRepoPrivate: typeof raw.isRepoPrivate === "boolean" ? raw.isRepoPrivate : void 0,
      downloadUrl: String(raw.downloadUrl || ""),
      secureDownloadPath: raw.secureDownloadPath ? String(raw.secureDownloadPath) : void 0,
      sha256: raw.sha256 ? String(raw.sha256) : void 0,
      signingCertSha256: raw.signingCertSha256 ? String(raw.signingCertSha256) : void 0,
      status: isActive ? "published" : "paused",
      isMandatory: Boolean(raw.isMandatory),
      isActive,
      isHidden: !isActive,
      configuredGithubOwner: raw.configuredGithubOwner ? String(raw.configuredGithubOwner).trim() : "",
      configuredGithubRepo: raw.configuredGithubRepo ? String(raw.configuredGithubRepo).trim() : "",
      configuredApiServerUrl: discoveredServerUrl
    };
    return {
      configuredGithubOwner: String(raw.configuredGithubOwner || "").trim(),
      configuredGithubRepo: String(raw.configuredGithubRepo || "").trim(),
      configuredApiServerUrl: discoveredServerUrl,
      configuredSettingsUpdatedAt: raw.configuredSettingsUpdatedAt ? Number(raw.configuredSettingsUpdatedAt) : null,
      latestUpdate
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (parentSignal) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}
var CancelledRequestError = class extends Error {
  constructor() {
    super("تم إلغاء الطلب عند مغادرة الصفحة");
    this.isCancelled = true;
  }
};
function translateNetworkOrHttpErrorAr(err, httpStatus, serverErrorText) {
  const cleanServerErr = String(serverErrorText || "").trim();
  if (httpStatus === 401) {
    return cleanServerErr || "انتهت جلسة تسجيل الدخول أو يلزم الدخول بحساب مالك التطبيق.";
  }
  if (httpStatus === 403) {
    return cleanServerErr || "هذه العملية مخصصة حصرياً لمالك تطبيق Sami (Owner Only).";
  }
  if (httpStatus === 404) {
    return cleanServerErr || "لم يتم العثور على مسار خدمة التحديثات على الخادم المتصل به.";
  }
  if (httpStatus && httpStatus >= 500) {
    return cleanServerErr || `واجه الخادم خطأً داخلياً مؤقتاً (HTTP ${httpStatus}). يرجى المحاولة مرة أخرى.`;
  }
  if (cleanServerErr) {
    return cleanServerErr;
  }
  const rawMsg = String(err?.message || err || "").trim();
  const lower = rawMsg.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed") || lower.includes("network request failed") || lower.includes("fetch")) {
    return "تعذر الاتصال بخادم التحديثات المنشور عبر HTTPS. يرجى التحقق من اتصال الإنترنت وعنوان الخادم ثم الضغط على «إعادة المحاولة».";
  }
  if (err?.name === "TimeoutError" || lower.includes("timeout") || lower.includes("timed out")) {
    return "انتهت مهلة الاتصال بالخادم (15 ثانية). تحقق من استقرار الشبكة ثم اضغط «إعادة المحاولة».";
  }
  if (!rawMsg || /^[A-Za-z0-9_:\s.,()-]+$/.test(rawMsg)) {
    return "تعذر إتمام الاتصال بالخادم حالياً. يرجى المحاولة مرة أخرى.";
  }
  return rawMsg;
}
async function fetchJsonApi(url, options = {}) {
  const { method = "GET", headers = {}, body, timeoutMs = 15e3, parentSignal } = options;
  if (parentSignal?.aborted) {
    throw new CancelledRequestError();
  }
  const ctrl = new AbortController();
  let timedOut = false;
  const onParentAbort = () => ctrl.abort();
  if (parentSignal) {
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...headers
      },
      body,
      cache: "no-store",
      signal: ctrl.signal
    });
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      if (parentSignal?.aborted) throw new CancelledRequestError();
      throw new Error(
        "العنوان المتصل به لم يُرجع استجابة API صالحة (JSON). تأكد من الاتصال بالخادم الفعلي المنشور عبر HTTPS وليس عنوان معاينة."
      );
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    if (parentSignal?.aborted || err instanceof CancelledRequestError) {
      throw new CancelledRequestError();
    }
    if (timedOut) {
      const timeoutErr = new Error(
        "انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت ثم الضغط على «إعادة المحاولة»."
      );
      timeoutErr.name = "TimeoutError";
      throw timeoutErr;
    }
    throw new Error(translateNetworkOrHttpErrorAr(err));
  } finally {
    clearTimeout(timer);
    if (parentSignal) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}
function getAuthCredentials() {
  let token = "";
  let rawSession = "";
  try {
    rawSession = localStorage.getItem("sami_auth_user_session") || "";
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed && parsed.token) {
        token = String(parsed.token);
      }
    }
  } catch {
  }
  const encodedSession = rawSession ? encodeURIComponent(rawSession) : "";
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (encodedSession) headers["X-Sami-Session"] = encodedSession;
  return { token, encodedSession, headers };
}
function getInstalledSamiAppInfo() {
  const w = typeof window !== "undefined" ? window : {};
  try {
    if (w.SamiBridge && typeof w.SamiBridge.getInstalledAppInfo === "function") {
      const raw = w.SamiBridge.getInstalledAppInfo();
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (parsed && Number(parsed.versionCode) > 0) {
          w.__samiNativeAppInfo = parsed;
          return {
            applicationId: String(parsed.applicationId || SAMI_EXPECTED_APP_ID),
            versionName: String(parsed.versionName || SAMI_FALLBACK_VERSION_NAME),
            versionCode: Number(parsed.versionCode),
            signingCertSha256: String(parsed.signingCertSha256 || ""),
            canInstallPackages: Boolean(parsed.canInstallPackages),
            isAndroidNative: true
          };
        }
      }
    }
    if (w.__samiNativeAppInfo && Number(w.__samiNativeAppInfo.versionCode) > 0) {
      const p = w.__samiNativeAppInfo;
      return {
        applicationId: String(p.applicationId || SAMI_EXPECTED_APP_ID),
        versionName: String(p.versionName || SAMI_FALLBACK_VERSION_NAME),
        versionCode: Number(p.versionCode),
        signingCertSha256: String(p.signingCertSha256 || ""),
        canInstallPackages: Boolean(p.canInstallPackages),
        isAndroidNative: true
      };
    }
  } catch {
  }
  return {
    applicationId: SAMI_EXPECTED_APP_ID,
    versionName: SAMI_FALLBACK_VERSION_NAME,
    versionCode: SAMI_FALLBACK_VERSION_CODE,
    signingCertSha256: "",
    canInstallPackages: false,
    isAndroidNative: false
  };
}
function shouldShowCloudAppUpdate(config) {
  if (!config) return false;
  if (config.isActive !== true || config.isHidden === true) return false;
  if (config.status && config.status !== "published") return false;
  const isGitHubRelease = config.storageSource === "github_releases" || Boolean(config.githubReleaseId) || Boolean(config.githubAssetId) || typeof config.downloadUrl === "string" && config.downloadUrl.includes("/releases/download/");
  if (!isGitHubRelease) return false;
  const installed = getInstalledSamiAppInfo();
  return Number(config.versionCode) > installed.versionCode;
}
function formatBytesAr(bytes) {
  const b = Number(bytes || 0);
  if (!b || b <= 0) return "0.00 MB";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
function formatSpeedAr(bytesPerSec) {
  const s = Number(bytesPerSec || 0);
  if (!s || s <= 0) return "";
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(0)} KB/s`;
  return `${(s / (1024 * 1024)).toFixed(2)} MB/s`;
}
function encodeUtf8Base64(text) {
  try {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return "";
  }
}
async function computeArrayBufferSha256Hex(buffer) {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  const arr = new Uint8Array(hashBuf);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function normalizeFpHex(fp) {
  return String(fp || "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}
function formatColonFp(hex) {
  const clean = normalizeFpHex(hex).toUpperCase();
  if (clean.length !== 64) return clean;
  return clean.match(/.{1,2}/g).join(":");
}
function parseBinaryManifestClient(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.byteLength < 16 || dv.getUint16(0, true) !== 3) {
    throw new Error("ملف AndroidManifest.xml داخل الحزمة ليس بصيغة Android Binary XML صالحة");
  }
  let offset = dv.getUint16(2, true);
  const strings = [];
  const resIds = [];
  let applicationId = "";
  let versionCode = 0;
  let versionCodeMajor = 0;
  let versionName = "";
  while (offset + 8 <= u8.byteLength) {
    const chunkType = dv.getUint16(offset, true);
    const headerSize = dv.getUint16(offset + 2, true);
    const chunkSize = dv.getUint32(offset + 4, true);
    if (chunkSize < 8 || offset + chunkSize > u8.byteLength) break;
    if (chunkType === 1) {
      const stringCount = dv.getUint32(offset + 8, true);
      const flags = dv.getUint32(offset + 16, true);
      const stringsStart = dv.getUint32(offset + 20, true);
      const isUtf8 = (flags & 1 << 8) !== 0;
      const offsetsBase = offset + headerSize;
      const poolDataBase = offset + stringsStart;
      for (let i = 0; i < stringCount; i++) {
        const strOff = poolDataBase + dv.getUint32(offsetsBase + i * 4, true);
        if (strOff >= offset + chunkSize) {
          strings.push("");
          continue;
        }
        if (isUtf8) {
          let p = strOff;
          p += (u8[p] & 128) !== 0 ? 2 : 1;
          let byteLen = u8[p];
          if ((byteLen & 128) !== 0) {
            byteLen = (byteLen & 127) << 8 | u8[p + 1];
            p += 2;
          } else {
            p += 1;
          }
          strings.push(new TextDecoder("utf-8").decode(u8.subarray(p, p + byteLen)));
        } else {
          let p = strOff;
          let charLen = dv.getUint16(p, true);
          if ((charLen & 32768) !== 0) {
            charLen = (charLen & 32767) << 16 | dv.getUint16(p + 2, true);
            p += 4;
          } else {
            p += 2;
          }
          strings.push(new TextDecoder("utf-16le").decode(u8.subarray(p, p + charLen * 2)));
        }
      }
    } else if (chunkType === 384) {
      const count = Math.floor((chunkSize - headerSize) / 4);
      for (let i = 0; i < count; i++) {
        resIds.push(dv.getUint32(offset + headerSize + i * 4, true));
      }
    } else if (chunkType === 258) {
      const nameIdx = dv.getInt32(offset + 20, true);
      const attrStart = dv.getUint16(offset + 24, true);
      const attrSize = dv.getUint16(offset + 26, true);
      const attrCount = dv.getUint16(offset + 28, true);
      const elemName = nameIdx >= 0 && nameIdx < strings.length ? strings[nameIdx] : "";
      if (elemName === "manifest" && attrSize >= 20) {
        const attrBase = offset + 16 + attrStart;
        for (let i = 0; i < attrCount; i++) {
          const aOff = attrBase + i * attrSize;
          if (aOff + 20 > offset + chunkSize) break;
          const aNameIdx = dv.getInt32(aOff + 4, true);
          const rawValIdx = dv.getInt32(aOff + 8, true);
          const dataType = u8[aOff + 15];
          const dataVal = dv.getUint32(aOff + 16, true);
          const aName = aNameIdx >= 0 && aNameIdx < strings.length ? strings[aNameIdx] : "";
          const resId = aNameIdx >= 0 && aNameIdx < resIds.length ? resIds[aNameIdx] : 0;
          const strVal = dataType === 3 && dataVal < strings.length ? strings[dataVal] : rawValIdx >= 0 && rawValIdx < strings.length ? strings[rawValIdx] : "";
          if (aName === "package" && strVal) {
            applicationId = strVal;
          } else if (resId === 16843291 || aName === "versionCode") {
            versionCode = dataVal;
          } else if (resId === 16844150 || aName === "versionCodeMajor") {
            versionCodeMajor = dataVal;
          } else if (resId === 16843292 || aName === "versionName") {
            versionName = strVal || String(dataVal);
          }
        }
      }
    }
    offset += chunkSize;
  }
  const fullCode = versionCodeMajor > 0 ? versionCodeMajor * 4294967296 + versionCode : versionCode;
  return { applicationId, versionCode: fullCode, versionName };
}
async function extractSigningCertSha256Client(buffer) {
  try {
    const u8 = new Uint8Array(buffer);
    const dv = new DataView(buffer);
    const minSearch = Math.max(0, u8.byteLength - 65557);
    let eocdOffset = -1;
    for (let i = u8.byteLength - 22; i >= minSearch; i--) {
      if (dv.getUint32(i, true) === 101010256) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) return null;
    const cdOffset = dv.getUint32(eocdOffset + 16, true);
    if (cdOffset < 32 || cdOffset > u8.byteLength) return null;
    const magic = new TextDecoder("ascii").decode(u8.subarray(cdOffset - 16, cdOffset));
    if (magic !== "APK Sig Block 42") return null;
    const blockSizeFooter = Number(dv.getBigUint64(cdOffset - 24, true));
    const blockStart = cdOffset - blockSizeFooter - 8;
    if (blockStart < 0) return null;
    let pos = blockStart + 8;
    const pairsEnd = cdOffset - 24;
    while (pos + 12 <= pairsEnd) {
      const pairLen = Number(dv.getBigUint64(pos, true));
      if (pairLen < 4 || pos + 8 + pairLen > pairsEnd) break;
      const blockId = dv.getUint32(pos + 8, true);
      if (blockId === 1896449818 || blockId === 4031998144 || blockId === 462663009) {
        const valOff = pos + 12;
        const firstSignerOff = valOff + 8;
        const signedDataOff = firstSignerOff + 4;
        const digestsLen = dv.getUint32(signedDataOff, true);
        const certsOff = signedDataOff + 4 + digestsLen;
        const firstCertLen = dv.getUint32(certsOff + 4, true);
        const certStart = certsOff + 8;
        if (firstCertLen > 0 && certStart + firstCertLen <= pos + 8 + pairLen) {
          const certSlice = u8.slice(certStart, certStart + firstCertLen);
          const hex = await computeArrayBufferSha256Hex(certSlice.buffer);
          return formatColonFp(hex);
        }
      }
      pos += 8 + pairLen;
    }
    return null;
  } catch {
    return null;
  }
}
function GoldProgressBar({
  percent,
  variant = "gold"
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const fillClass = variant === "emerald" ? "fill-emerald-400" : variant === "rose" ? "fill-rose-500" : "fill-amber-400";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dir: "ltr", className: "w-full rounded-lg overflow-hidden bg-[#070a12] border border-slate-800 p-0.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 100 4", preserveAspectRatio: "none", className: "w-full h-2.5 block rounded", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "0", y: "0", width: "100", height: "4", className: "fill-slate-900" }),
    clamped > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "0", y: "0", width: clamped, height: "4", className: `${fillClass} transition-all duration-150` })
  ] }) });
}
var webDownloadMemoryStore = {
  versionCode: 0,
  chunks: [],
  downloadedBytes: 0,
  totalBytes: 0,
  verifiedBlob: null,
  abortCtrl: null,
  state: {
    phase: "idle",
    statusTextAr: "",
    errorDetailAr: null,
    targetVersionCode: 0,
    targetVersionName: "",
    downloadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    speedBytesPerSec: 0,
    canInstall: false,
    canResume: false,
    verifiedSha256: null,
    verifiedSigningCertSha256: null
  },
  listeners: /* @__PURE__ */ new Set()
};
function emitWebUpdateState(patch) {
  webDownloadMemoryStore.state = {
    ...webDownloadMemoryStore.state,
    ...patch
  };
  for (const fn of webDownloadMemoryStore.listeners) {
    try {
      fn(webDownloadMemoryStore.state);
    } catch {
    }
  }
}
function concatUint8Arrays(chunks, totalLength) {
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
async function runWebResumableDownloadAndVerify(config, isResume) {
  if (webDownloadMemoryStore.abortCtrl) {
    return;
  }
  if (webDownloadMemoryStore.versionCode !== config.versionCode) {
    webDownloadMemoryStore.versionCode = config.versionCode;
    webDownloadMemoryStore.chunks = [];
    webDownloadMemoryStore.downloadedBytes = 0;
    webDownloadMemoryStore.verifiedBlob = null;
  }
  const abortCtrl = new AbortController();
  webDownloadMemoryStore.abortCtrl = abortCtrl;
  const existingOffset = webDownloadMemoryStore.downloadedBytes;
  const expectedTotal = Number(config.fileSize || 0);
  emitWebUpdateState({
    phase: isResume && existingOffset > 0 ? "resuming" : "connecting",
    statusTextAr: isResume && existingOffset > 0 ? "جارٍ استئناف التنزيل" : "جارٍ الاتصال بالخادم",
    errorDetailAr: null,
    targetVersionCode: config.versionCode,
    targetVersionName: config.versionName,
    downloadedBytes: existingOffset,
    totalBytes: expectedTotal,
    percent: expectedTotal > 0 ? Math.min(99, Math.floor(existingOffset * 99 / expectedTotal)) : 0,
    speedBytesPerSec: 0,
    canInstall: false,
    canResume: false
  });
  try {
    let serverBase = getSamiServerBaseUrl();
    if (isAndroidLocalAssetOrigin() && !serverBase) {
      const cloudSnap = await discoverCloudStateFromFirestore(abortCtrl.signal);
      if (cloudSnap?.configuredApiServerUrl) {
        serverBase = cloudSnap.configuredApiServerUrl;
      }
    }
    const proxyPath = config.secureDownloadPath || `/api/app-updates/download/v_${config.versionCode}`;
    const canUseDirectPublicUrl = isAndroidLocalAssetOrigin() && !serverBase && !config.isRepoPrivate && typeof config.downloadUrl === "string" && config.downloadUrl.startsWith("https://github.com/");
    if (isAndroidLocalAssetOrigin() && !serverBase && !canUseDirectPublicUrl) {
      throw new Error("لم يتم تسجيل عنوان الخادم المنشور (HTTPS) لتنزيل التحديث حالياً.");
    }
    const proxyUrl = canUseDirectPublicUrl ? config.downloadUrl : `${serverBase}${proxyPath}`;
    const { headers: authHeaders } = getAuthCredentials();
    const reqHeaders = canUseDirectPublicUrl ? {} : { ...authHeaders };
    if (existingOffset > 0 && (expectedTotal <= 0 || existingOffset < expectedTotal)) {
      reqHeaders.Range = `bytes=${existingOffset}-`;
    }
    const res = await fetch(proxyUrl, {
      method: "GET",
      headers: reqHeaders,
      signal: abortCtrl.signal
    });
    if (!res.ok && res.status !== 206) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(translateNetworkOrHttpErrorAr(null, res.status, errBody?.error));
    }
    const isPartial = res.status === 206 && existingOffset > 0;
    if (!isPartial) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
    }
    const contentLen = parseInt(res.headers.get("content-length") || "0", 10) || 0;
    const resolvedTotal = expectedTotal > 0 ? expectedTotal : isPartial && contentLen > 0 ? existingOffset + contentLen : contentLen;
    webDownloadMemoryStore.totalBytes = resolvedTotal;
    emitWebUpdateState({
      phase: "starting",
      statusTextAr: "جارٍ بدء التنزيل",
      totalBytes: resolvedTotal
    });
    if (!res.body) {
      throw new Error("لم يُرجع الخادم دفق بيانات قابل للقراءة");
    }
    const reader = res.body.getReader();
    let windowStart = Date.now();
    let windowBytes = 0;
    let speed = 0;
    let lastUiTick = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        webDownloadMemoryStore.chunks.push(value);
        webDownloadMemoryStore.downloadedBytes += value.byteLength;
        windowBytes += value.byteLength;
        const now = Date.now();
        if (now - windowStart >= 500) {
          speed = Math.round(windowBytes * 1e3 / (now - windowStart));
          windowStart = now;
          windowBytes = 0;
        }
        if (now - lastUiTick >= 120) {
          lastUiTick = now;
          const dl = webDownloadMemoryStore.downloadedBytes;
          const pct = resolvedTotal > 0 ? Math.min(99, Math.floor(dl * 99 / resolvedTotal)) : 0;
          emitWebUpdateState({
            phase: "downloading",
            statusTextAr: "جارٍ تنزيل التحديث",
            downloadedBytes: dl,
            totalBytes: resolvedTotal,
            percent: pct,
            speedBytesPerSec: speed
          });
        }
      }
    }
    webDownloadMemoryStore.abortCtrl = null;
    const fullBytes = concatUint8Arrays(
      webDownloadMemoryStore.chunks,
      webDownloadMemoryStore.downloadedBytes
    );
    emitWebUpdateState({
      phase: "verifying",
      statusTextAr: "اكتمل التنزيل — جارٍ التحقق من سلامة الملف وشهادة التوقيع...",
      downloadedBytes: fullBytes.byteLength,
      totalBytes: expectedTotal || fullBytes.byteLength,
      percent: 99,
      speedBytesPerSec: 0
    });
    if (expectedTotal > 0 && fullBytes.byteLength !== expectedTotal) {
      throw new Error(
        `حجم الملف المحمّل (${fullBytes.byteLength} بايت) لا يطابق الحجم الرسمي المعتمد (${expectedTotal} بايت)`
      );
    }
    const localSha256 = await computeArrayBufferSha256Hex(fullBytes.buffer);
    if (config.sha256 && localSha256.toLowerCase() !== config.sha256.toLowerCase()) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error("بصمة SHA-256 للملف المحمّل لا تطابق البصمة الرسمية المعتمدة؛ تم حذف الملف التالف.");
    }
    let zip;
    try {
      zip = await import_jszip.default.loadAsync(fullBytes);
    } catch {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error("الملف المحمّل تالف ولا يمثل حزمة Android APK صالحة.");
    }
    const manifestFile = zip.file("AndroidManifest.xml");
    const dexFile = zip.file("classes.dex");
    if (!manifestFile || !dexFile) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error("الحزمة المحمّلة تفتقر إلى ملفات تطبيق Android الأساسية؛ تم رفض التثبيت.");
    }
    const manifestU8 = await manifestFile.async("uint8array");
    const parsedManifest = parseBinaryManifestClient(manifestU8);
    if (parsedManifest.applicationId !== SAMI_EXPECTED_APP_ID) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error(
        `معرّف الحزمة داخل الملف (${parsedManifest.applicationId}) لا يطابق تطبيق Sami (${SAMI_EXPECTED_APP_ID}).`
      );
    }
    const installed = getInstalledSamiAppInfo();
    if (parsedManifest.versionCode <= installed.versionCode) {
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      throw new Error(
        `كود الإصدار داخل الحزمة (${parsedManifest.versionCode}) ليس أحدث من النسخة المثبتة (${installed.versionCode}).`
      );
    }
    const certColon = await extractSigningCertSha256Client(fullBytes.buffer);
    if (config.signingCertSha256 && certColon) {
      if (normalizeFpHex(certColon) !== normalizeFpHex(config.signingCertSha256)) {
        webDownloadMemoryStore.chunks = [];
        webDownloadMemoryStore.downloadedBytes = 0;
        throw new Error("شهادة توقيع التحديث لا تطابق شهادة توقيع تطبيق Sami الأصلية؛ تم حظر التثبيت.");
      }
    }
    webDownloadMemoryStore.verifiedBlob = new Blob([fullBytes.buffer], {
      type: "application/vnd.android.package-archive"
    });
    emitWebUpdateState({
      phase: "verified",
      statusTextAr: "اكتمل التنزيل",
      errorDetailAr: null,
      downloadedBytes: fullBytes.byteLength,
      totalBytes: fullBytes.byteLength,
      percent: 100,
      speedBytesPerSec: 0,
      canInstall: true,
      canResume: false,
      verifiedSha256: localSha256,
      verifiedSigningCertSha256: certColon || config.signingCertSha256 || null
    });
  } catch (err) {
    webDownloadMemoryStore.abortCtrl = null;
    if (abortCtrl.signal.aborted) {
      return;
    }
    const dl = webDownloadMemoryStore.downloadedBytes;
    const pct = expectedTotal > 0 ? Math.min(99, Math.floor(dl * 99 / expectedTotal)) : 0;
    emitWebUpdateState({
      phase: "failed",
      statusTextAr: "فشل التنزيل",
      errorDetailAr: translateNetworkOrHttpErrorAr(err),
      downloadedBytes: dl,
      totalBytes: expectedTotal,
      percent: pct,
      speedBytesPerSec: 0,
      canInstall: false,
      canResume: dl > 0
    });
  }
}
function SamiUserUpdateModal({
  config,
  isOpen,
  onDismiss,
  isPreview = false
}) {
  const installed = getInstalledSamiAppInfo();
  const isNativeAndroid = installed.isAndroidNative;
  const [dlState, setDlState] = useState(() => {
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid && w.SamiBridge && typeof w.SamiBridge.getUpdateState === "function") {
      try {
        const raw = JSON.parse(w.SamiBridge.getUpdateState());
        if (raw && (!config || Number(raw.targetVersionCode) === Number(config.versionCode))) {
          return raw;
        }
      } catch {
      }
    }
    if (config && webDownloadMemoryStore.versionCode === Number(config.versionCode)) {
      return webDownloadMemoryStore.state;
    }
    return {
      phase: "idle",
      statusTextAr: "",
      errorDetailAr: null,
      targetVersionCode: config?.versionCode || 0,
      targetVersionName: config?.versionName || "",
      downloadedBytes: 0,
      totalBytes: config?.fileSize || 0,
      percent: 0,
      speedBytesPerSec: 0,
      canInstall: false,
      canResume: false,
      verifiedSha256: null,
      verifiedSigningCertSha256: null
    };
  });
  const [webInstallNotice, setWebInstallNotice] = useState(null);
  useEffect(() => {
    if (!isOpen || !config) return;
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid) {
      const syncFromNative = (ev) => {
        try {
          const detail = ev?.detail || (w.SamiBridge?.getUpdateState ? JSON.parse(w.SamiBridge.getUpdateState()) : null);
          if (detail && (detail.targetVersionCode === 0 || Number(detail.targetVersionCode) === Number(config.versionCode))) {
            setDlState(detail);
          }
        } catch {
        }
      };
      syncFromNative();
      window.addEventListener("sami_native_update_state", syncFromNative);
      return () => {
        window.removeEventListener("sami_native_update_state", syncFromNative);
      };
    } else {
      const listener = (next) => {
        if (next.targetVersionCode === 0 || Number(next.targetVersionCode) === Number(config.versionCode)) {
          setDlState({ ...next });
        }
      };
      webDownloadMemoryStore.listeners.add(listener);
      if (webDownloadMemoryStore.versionCode === Number(config.versionCode)) {
        setDlState({ ...webDownloadMemoryStore.state });
      }
      return () => {
        webDownloadMemoryStore.listeners.delete(listener);
      };
    }
  }, [isOpen, config?.versionCode, isNativeAndroid]);
  if (!isOpen || !config) return null;
  if (!isPreview && !shouldShowCloudAppUpdate(config)) return null;
  const isMandatory = Boolean(config.isMandatory);
  const phase = (dlState.phase || "idle").toLowerCase();
  const isDownloading = phase === "connecting" || phase === "starting" || phase === "downloading" || phase === "resuming" || phase === "verifying";
  const isPaused = phase === "paused";
  const isFailed = phase === "failed";
  const isVerifiedReady = phase === "verified" && dlState.canInstall === true;
  const needsPerm = phase === "needs_install_permission";
  const isInstalling = phase === "installing";
  const handleStartDownload = () => {
    setWebInstallNotice(null);
    if (isPreview && !config.downloadUrl && !config.githubAssetId) {
      setDlState((prev) => ({
        ...prev,
        phase: "failed",
        statusTextAr: "فشل التنزيل",
        errorDetailAr: "هذه معاينة تصميمية فقط؛ سيتم تفعيل التنزيل الفعلي فور رفع ملف الـ APK ونشره."
      }));
      return;
    }
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid && w.SamiBridge?.startAppUpdateDownload) {
      const serverBase = getSamiServerBaseUrl();
      const { token, encodedSession } = getAuthCredentials();
      w.SamiBridge.startAppUpdateDownload(
        JSON.stringify(config),
        serverBase,
        JSON.stringify({ token, session: encodedSession })
      );
    } else {
      runWebResumableDownloadAndVerify(config, false);
    }
  };
  const handlePauseDownload = () => {
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid && w.SamiBridge?.pauseAppUpdateDownload) {
      try {
        setDlState(JSON.parse(w.SamiBridge.pauseAppUpdateDownload()));
      } catch {
      }
    } else {
      if (webDownloadMemoryStore.abortCtrl) {
        webDownloadMemoryStore.abortCtrl.abort();
        webDownloadMemoryStore.abortCtrl = null;
      }
      emitWebUpdateState({
        phase: "paused",
        statusTextAr: "تم إيقاف التنزيل مؤقتًا",
        speedBytesPerSec: 0,
        canResume: webDownloadMemoryStore.downloadedBytes > 0
      });
    }
  };
  const handleResumeDownload = () => {
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid && w.SamiBridge?.resumeAppUpdateDownload) {
      const resStr = w.SamiBridge.resumeAppUpdateDownload();
      try {
        const parsed = JSON.parse(resStr);
        if (!parsed?.ok) {
          handleStartDownload();
        }
      } catch {
        handleStartDownload();
      }
    } else {
      runWebResumableDownloadAndVerify(config, true);
    }
  };
  const handleCancelDownload = () => {
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid && w.SamiBridge?.cancelAppUpdateDownload) {
      try {
        setDlState(JSON.parse(w.SamiBridge.cancelAppUpdateDownload()));
      } catch {
      }
    } else {
      if (webDownloadMemoryStore.abortCtrl) {
        webDownloadMemoryStore.abortCtrl.abort();
        webDownloadMemoryStore.abortCtrl = null;
      }
      webDownloadMemoryStore.chunks = [];
      webDownloadMemoryStore.downloadedBytes = 0;
      webDownloadMemoryStore.verifiedBlob = null;
      emitWebUpdateState({
        phase: "idle",
        statusTextAr: "",
        errorDetailAr: null,
        downloadedBytes: 0,
        percent: 0,
        speedBytesPerSec: 0,
        canInstall: false,
        canResume: false
      });
    }
  };
  const handleInstallVerifiedApk = () => {
    const w = typeof window !== "undefined" ? window : {};
    if (isNativeAndroid && w.SamiBridge?.installVerifiedAppUpdate) {
      w.SamiBridge.installVerifiedAppUpdate();
      return;
    }
    if (webDownloadMemoryStore.verifiedBlob) {
      const blobUrl = URL.createObjectURL(webDownloadMemoryStore.verifiedBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = config.fileName || `Sami-v${config.versionName}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5e3);
      setWebInstallNotice(
        "تم التحقق من سلامة الحزمة وشهادة التوقيع وحفظ ملف الـ APK المعتمد على جهازك. داخل تطبيق Sami على هاتف Android يفتح هذا الزر مثبّت النظام الرسمي مباشرة."
      );
    }
  };
  const totalSizeDisplay = dlState.totalBytes > 0 ? dlState.totalBytes : config.fileSize || 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      dir: "rtl",
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative w-full max-w-md bg-[#090d17] border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-right space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 font-black text-lg", children: isMandatory ? "⚡" : "✦" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "text-base font-black text-white", children: isMandatory ? "تحديث إلزامي لتطبيق Sami" : "تحديث جديد متاح لتطبيق Sami" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs font-bold mt-0.5 text-amber-300/90", children: isMandatory ? "يلزم تثبيت هذا التحديث للمتابعة وضمان استقرار الحساب والبيانات" : "إصدار محدث جاهز للتنزيل والتثبيت المباشر من داخل التطبيق" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              className: `text-[10px] font-black px-2.5 py-1 rounded-md border shrink-0 ${isMandatory ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-amber-400/10 border-amber-400/30 text-amber-300"}`,
              children: isMandatory ? "إلزامي" : "اختياري"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-3 gap-2 bg-[#0d1322] border border-slate-800 rounded-xl p-3 text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border-l border-slate-800/80 pl-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-slate-400 font-bold", children: "الإصدار المثبت" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "span",
              {
                dir: "ltr",
                className: "block text-xs font-black text-slate-200 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5",
                children: [
                  "v",
                  installed.versionName
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "block text-[10px] text-slate-500 font-['JetBrains_Mono',monospace] tabular-nums", children: [
              "Build ",
              installed.versionCode
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border-l border-slate-800/80 pl-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-amber-400 font-bold", children: "الإصدار الجديد" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "span",
              {
                dir: "ltr",
                className: "block text-sm font-black text-amber-300 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5",
                children: [
                  "v",
                  config.versionName
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "block text-[10px] text-amber-200/70 font-['JetBrains_Mono',monospace] tabular-nums", children: [
              "Build ",
              config.versionCode
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-slate-400 font-bold", children: "حجم الحزمة" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                dir: "ltr",
                className: "block text-xs font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5",
                children: totalSizeDisplay > 0 ? formatBytesAr(totalSizeDisplay) : "APK رسمي"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-emerald-400 font-bold", children: "موقّع وموثّق" })
          ] })
        ] }),
        config.description && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[11px] font-black text-amber-400 mb-1.5", children: "تفاصيل التحديث وما الجديد:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap", children: config.description })
        ] }),
        phase !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b101d] border border-slate-800 rounded-xl p-3.5 space-y-2.5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-2 text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: `font-black ${isFailed ? "text-rose-400" : isVerifiedReady ? "text-emerald-400" : "text-amber-300"}`,
                children: dlState.statusTextAr || "جارٍ معالجة التحديث"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "span",
              {
                dir: "ltr",
                className: "font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums",
                children: [
                  dlState.percent,
                  "%"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            GoldProgressBar,
            {
              percent: dlState.percent,
              variant: isFailed ? "rose" : isVerifiedReady ? "emerald" : "gold"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between text-[11px] text-slate-400 font-['JetBrains_Mono',monospace] tabular-nums", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { dir: "ltr", children: [
              formatBytesAr(dlState.downloadedBytes),
              " / ",
              formatBytesAr(totalSizeDisplay)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dir: "ltr", className: "text-amber-300", children: isDownloading && dlState.speedBytesPerSec > 0 ? formatSpeedAr(dlState.speedBytesPerSec) : "" })
          ] }),
          isVerifiedReady && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-[11px] text-emerald-300 font-bold", children: "✓ تم التحقق من اكتمال الحجم وبصمة SHA-256 ومطابقة شهادة توقيع Sami الأصلية بنجاح." }),
          needsPerm && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 text-[11px] text-amber-200 font-bold", children: "يرجى تفعيل خيار «السماح من هذا المصدر» في شاشة إعدادات Android ثم العودة لإتمام التثبيت تلقائياً." }),
          dlState.errorDetailAr && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-[11px] text-rose-300 leading-relaxed", children: dlState.errorDetailAr }),
          webInstallNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 text-[11px] text-amber-200 leading-relaxed", children: webInstallNotice })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-2 pt-1", children: [
          (isVerifiedReady || needsPerm || isInstalling) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: handleInstallVerifiedApk,
              className: "w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✅ تثبيت التحديث الآن" })
            }
          ),
          phase === "idle" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: handleStartDownload,
              className: "w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "تحميل التحديث الآن" })
            }
          ),
          isDownloading && phase !== "verifying" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: handlePauseDownload,
                className: "flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-400/30 text-amber-300 font-black text-xs transition cursor-pointer",
                children: "إيقاف مؤقت"
              }
            ),
            !isMandatory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: handleCancelDownload,
                className: "py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer",
                children: "إلغاء"
              }
            )
          ] }),
          (isPaused || isFailed) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: dlState.canResume ? handleResumeDownload : handleStartDownload,
                className: "flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition cursor-pointer",
                children: dlState.canResume ? "استئناف التنزيل" : "إعادة المحاولة"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: handleCancelDownload,
                className: "py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer",
                children: "إلغاء"
              }
            )
          ] }),
          (!isMandatory || isPreview) && onDismiss && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: onDismiss,
              className: "w-full py-2.5 px-4 rounded-xl bg-[#0d121d] hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 font-bold text-xs border border-slate-800 transition cursor-pointer",
              children: isPreview ? "إغلاق المعاينة" : "لاحقًا"
            }
          )
        ] })
      ] })
    }
  );
}
function SamiAdminUpdatePanel({
  currentUser,
  onToast
}) {
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const notify = useCallback((msg, isError = false) => {
    if (onToastRef.current) onToastRef.current(msg, isError);
  }, []);
  const fileInputRef = useRef(null);
  const activeXhrRef = useRef(null);
  const pollTimerRef = useRef(null);
  const unmountAbortRef = useRef(null);
  const inFlightBootstrapRef = useRef(false);
  const mountedRef = useRef(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connectionState, setConnectionState] = useState(
    "connecting"
  );
  const [connectionErrorAr, setConnectionErrorAr] = useState(null);
  const [githubStatus, setGithubStatus] = useState(null);
  const [vaultInfo, setVaultInfo] = useState(null);
  const [signingKeyInfo, setSigningKeyInfo] = useState(null);
  const [currentPublished, setCurrentPublished] = useState(null);
  const [effectiveMinVersionCode, setEffectiveMinVersionCode] = useState(SAMI_FALLBACK_VERSION_CODE);
  const [historyList, setHistoryList] = useState([]);
  const settingsInitializedRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ownerInput, setOwnerInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [serverUrlInput, setServerUrlInput] = useState(() => getSamiServerBaseUrl());
  const [showToken, setShowToken] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [inspectingFile, setInspectingFile] = useState(false);
  const [inspection, setInspection] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [description, setDescription] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadSpeedBps, setUploadSpeedBps] = useState(0);
  const [uploadPhaseText, setUploadPhaseText] = useState("");
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const installedApp = getInstalledSamiAppInfo();
  const isLocalAndroidOrigin = isAndroidLocalAssetOrigin();
  const resolveCallableServerBase = useCallback(
    async (explicitCandidate, signal) => {
      if (!isAndroidLocalAssetOrigin()) {
        return { serverBase: "", cloudSnap: null };
      }
      const explicitValid = sanitizeProductionServerUrl(explicitCandidate);
      if (explicitValid) {
        return { serverBase: explicitValid, cloudSnap: null };
      }
      const cloudSnap = await discoverCloudStateFromFirestore(signal);
      if (cloudSnap?.configuredApiServerUrl) {
        return { serverBase: cloudSnap.configuredApiServerUrl, cloudSnap };
      }
      const cachedValid = getSamiServerBaseUrl();
      if (cachedValid) {
        return { serverBase: cachedValid, cloudSnap };
      }
      return { serverBase: null, cloudSnap };
    },
    []
  );
  const loadCloudStatusAndHistory = useCallback(
    async (opts) => {
      if (inFlightBootstrapRef.current) return;
      inFlightBootstrapRef.current = true;
      setLoadingStatus(true);
      setConnectionErrorAr(null);
      const signal = unmountAbortRef.current?.signal;
      try {
        const { serverBase, cloudSnap } = await resolveCallableServerBase(void 0, signal);
        if (!mountedRef.current || signal?.aborted) return;
        if (serverBase === null) {
          if (cloudSnap) {
            if (cloudSnap.latestUpdate) {
              setCurrentPublished(cloudSnap.latestUpdate);
              setEffectiveMinVersionCode(
                Math.max(cloudSnap.latestUpdate.versionCode || 0, SAMI_FALLBACK_VERSION_CODE)
              );
            }
            const savedOwner = cloudSnap.configuredGithubOwner;
            const savedRepo = cloudSnap.configuredGithubRepo;
            if (savedOwner || savedRepo) {
              setGithubStatus({
                configured: false,
                liveTested: false,
                hasToken: false,
                owner: savedOwner,
                repo: savedRepo,
                fullName: savedOwner && savedRepo ? `${savedOwner}/${savedRepo}` : "",
                exists: Boolean(savedOwner && savedRepo),
                canPublishReleases: false
              });
              if (!settingsInitializedRef.current) {
                settingsInitializedRef.current = true;
                setOwnerInput(savedOwner);
                setRepoInput(savedRepo);
              }
            }
          }
          setConnectionState("needs_server_url");
          setSettingsOpen(true);
          setConnectionErrorAr(
            "التطبيق يعمل محلياً من حزمة Android ولم يتم تسجيل عنوان الخادم المنشور (HTTPS) بعد. أدخل عنوان الخادم المنشور في الإعدادات أدناه لربط لوحة التحديثات بالخادم الفعلي."
          );
          return;
        }
        if (serverBase) {
          setServerUrlInput(serverBase);
        }
        const { headers } = getAuthCredentials();
        const { ok, status, data } = await fetchJsonApi(
          `${serverBase}/api/app-updates/admin-bootstrap?_t=${Date.now()}`,
          {
            method: "GET",
            headers,
            timeoutMs: 15e3,
            parentSignal: signal
          }
        );
        if (!mountedRef.current || signal?.aborted) return;
        if (!ok || !data?.success) {
          const errText = translateNetworkOrHttpErrorAr(null, status, data?.error);
          setConnectionState("error");
          setConnectionErrorAr(errText);
          if (opts?.showToastOnError) {
            notify(errText, true);
          }
          return;
        }
        const gh = data.github || null;
        const vInfo = data.vault || gh?.vault || null;
        setGithubStatus(gh);
        setVaultInfo(vInfo);
        setSigningKeyInfo(data.signingKey || null);
        setCurrentPublished(data.currentPublished || null);
        setEffectiveMinVersionCode(Number(data.effectiveMinVersionCode) || SAMI_FALLBACK_VERSION_CODE);
        if (Array.isArray(data.updates)) {
          setHistoryList(data.updates);
        }
        if (vInfo?.apiServerUrl) {
          const syncedUrl = persistProductionServerUrlLocally(vInfo.apiServerUrl);
          if (syncedUrl) setServerUrlInput(syncedUrl);
        }
        if (!settingsInitializedRef.current) {
          settingsInitializedRef.current = true;
          setOwnerInput(gh?.owner || "");
          setRepoInput(gh?.repo || "");
          if (!gh?.configured) {
            setSettingsOpen(true);
          }
        }
        setConnectionState("connected");
        setConnectionErrorAr(null);
      } catch (err) {
        if (err?.isCancelled || !mountedRef.current || signal?.aborted) {
          return;
        }
        const errText = translateNetworkOrHttpErrorAr(err);
        setConnectionState("error");
        setConnectionErrorAr(errText);
        if (opts?.showToastOnError) {
          notify(errText, true);
        }
      } finally {
        inFlightBootstrapRef.current = false;
        if (mountedRef.current) {
          setLoadingStatus(false);
        }
      }
    },
    [notify, resolveCallableServerBase]
  );
  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();
    unmountAbortRef.current = ctrl;
    const abortAllOnLeave = () => {
      ctrl.abort();
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
        activeXhrRef.current = null;
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", abortAllOnLeave);
      window.addEventListener("beforeunload", abortAllOnLeave);
    }
    loadCloudStatusAndHistory({ showToastOnError: false });
    return () => {
      mountedRef.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", abortAllOnLeave);
        window.removeEventListener("beforeunload", abortAllOnLeave);
      }
      abortAllOnLeave();
    };
  }, [loadCloudStatusAndHistory]);
  const handleSaveGitHubSettings = async () => {
    if (savingSettings || testingConnection || uploading) return;
    const cleanOwner = ownerInput.trim();
    const cleanRepo = repoInput.trim();
    const cleanTok = tokenInput.trim();
    const rawServerCandidate = serverUrlInput.trim();
    const hasExistingServerToken = Boolean(githubStatus?.hasToken || vaultInfo?.hasSavedToken);
    if (!cleanOwner) {
      const msg = "يرجى إدخال اسم مالك المستودع في حقل GITHUB_OWNER";
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    if (!cleanRepo) {
      const msg = "يرجى إدخال اسم المستودع في حقل GITHUB_REPO";
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    let validatedCustomServer = "";
    if (rawServerCandidate) {
      validatedCustomServer = sanitizeProductionServerUrl(rawServerCandidate);
      if (!validatedCustomServer) {
        const msg = "عنوان الخادم المنشور غير صالح؛ يجب أن يبدأ بـ https:// وألا يكون عنوان معاينة (ais-pre / ais-dev) أو localhost.";
        setSettingsFeedback({ ok: false, text: msg });
        notify(msg, true);
        return;
      }
    } else if (isLocalAndroidOrigin && !getSamiServerBaseUrl()) {
      const msg = "يرجى إدخال عنوان الخادم المنشور (HTTPS) أولاً لحفظ إعدادات GitHub بأمان على الخادم.";
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    if (!cleanTok && !hasExistingServerToken && !isLocalAndroidOrigin) {
      const msg = "يرجى إدخال التوكن السري في حقل GITHUB_TOKEN لحفظ الإعدادات لأول مرة";
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    setSavingSettings(true);
    setSettingsFeedback(null);
    const signal = unmountAbortRef.current?.signal;
    try {
      const { serverBase } = await resolveCallableServerBase(validatedCustomServer || void 0, signal);
      if (serverBase === null) {
        throw new Error("لم يتم تحديد عنوان الخادم المنشور (HTTPS) للاتصال به.");
      }
      const autoDetectedWebOrigin = !isLocalAndroidOrigin && typeof window !== "undefined" ? sanitizeProductionServerUrl(window.location.origin) : "";
      const effectiveApiServerUrl = validatedCustomServer || serverBase || autoDetectedWebOrigin;
      const { headers } = getAuthCredentials();
      const { ok, status, data } = await fetchJsonApi(`${serverBase}/api/app-updates/github-settings`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          githubOwner: cleanOwner,
          githubRepo: cleanRepo,
          ...cleanTok ? { githubToken: cleanTok } : {},
          ...effectiveApiServerUrl ? { apiServerUrl: effectiveApiServerUrl } : {}
        }),
        timeoutMs: 18e3,
        parentSignal: signal
      });
      if (!mountedRef.current || signal?.aborted) return;
      if (!ok || !data?.success) {
        throw new Error(translateNetworkOrHttpErrorAr(null, status, data?.error || "تعذر حفظ إعدادات GitHub Releases"));
      }
      if (effectiveApiServerUrl) {
        persistProductionServerUrlLocally(effectiveApiServerUrl);
        setServerUrlInput(effectiveApiServerUrl);
      }
      setTokenInput("");
      setShowToken(false);
      if (data.github) {
        setGithubStatus(data.github);
        setOwnerInput(data.github.owner || cleanOwner);
        setRepoInput(data.github.repo || cleanRepo);
      }
      if (data.vault || data.github?.vault) {
        setVaultInfo(data.vault || data.github?.vault);
      }
      setConnectionState("connected");
      setConnectionErrorAr(null);
      const feedbackMsg = data.message || `تم حفظ إعدادات GitHub Releases (${cleanOwner}/${cleanRepo}) في السحابة بشكل دائم بنجاح.`;
      setSettingsFeedback({ ok: true, text: feedbackMsg });
      notify(feedbackMsg, false);
    } catch (err) {
      if (err?.isCancelled || !mountedRef.current) return;
      const msg = translateNetworkOrHttpErrorAr(err);
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
    } finally {
      if (mountedRef.current) {
        setSavingSettings(false);
      }
    }
  };
  const handleTestGitHubConnection = async () => {
    if (testingConnection || savingSettings || uploading) return;
    const cleanOwner = ownerInput.trim();
    const cleanRepo = repoInput.trim();
    const cleanTok = tokenInput.trim();
    const rawServerCandidate = serverUrlInput.trim();
    if (!cleanOwner || !cleanRepo) {
      const msg = "يرجى إدخال GITHUB_OWNER وGITHUB_REPO أولاً لاختبار الاتصال";
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
      return;
    }
    let validatedCustomServer = "";
    if (rawServerCandidate) {
      validatedCustomServer = sanitizeProductionServerUrl(rawServerCandidate);
      if (!validatedCustomServer) {
        const msg = "عنوان الخادم المنشور غير صالح؛ يجب أن يبدأ بـ https:// وألا يكون عنوان معاينة (ais-pre / ais-dev) أو localhost.";
        setSettingsFeedback({ ok: false, text: msg });
        notify(msg, true);
        return;
      }
    }
    setTestingConnection(true);
    setSettingsFeedback(null);
    const signal = unmountAbortRef.current?.signal;
    try {
      const { serverBase } = await resolveCallableServerBase(validatedCustomServer || void 0, signal);
      if (serverBase === null) {
        throw new Error("يرجى إدخال عنوان الخادم المنشور (HTTPS) أولاً لاختبار اتصال GitHub.");
      }
      const { headers } = getAuthCredentials();
      const { ok, status, data } = await fetchJsonApi(`${serverBase}/api/app-updates/github-test`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          githubOwner: cleanOwner,
          githubRepo: cleanRepo,
          ...cleanTok ? { githubToken: cleanTok } : {}
        }),
        timeoutMs: 2e4,
        parentSignal: signal
      });
      if (!mountedRef.current || signal?.aborted) return;
      if (validatedCustomServer) {
        persistProductionServerUrlLocally(validatedCustomServer);
      }
      setConnectionState("connected");
      setConnectionErrorAr(null);
      if (data.github) {
        setGithubStatus(data.github);
      }
      if (data.vault || data.github?.vault) {
        setVaultInfo(data.vault || data.github?.vault);
      }
      const testPassed = Boolean(ok && data.success && data.github?.canPublishReleases);
      const msg = data.message || translateNetworkOrHttpErrorAr(null, status, data.error) || (testPassed ? "الاتصال بمستودع GitHub ناجح وجاهز للنشر ✓" : "فشل التحقق من الاتصال بمستودع GitHub");
      setSettingsFeedback({ ok: testPassed, text: msg });
      notify(msg, !testPassed);
    } catch (err) {
      if (err?.isCancelled || !mountedRef.current) return;
      const msg = translateNetworkOrHttpErrorAr(err);
      setSettingsFeedback({ ok: false, text: msg });
      notify(msg, true);
    } finally {
      if (mountedRef.current) {
        setTestingConnection(false);
      }
    }
  };
  const handleChooseApkClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };
  const inspectSelectedApk = async (file) => {
    setSelectedFile(file);
    setInspection(null);
    setLocalError(null);
    setUploadError(null);
    setUploadSuccessInfo(null);
    if (!file.name.toLowerCase().endsWith(".apk")) {
      const msg = "يرجى اختيار ملف بصيغة .apk فقط. تم رفض الملف المختار.";
      setLocalError(msg);
      notify(msg, true);
      return;
    }
    if (file.size <= 64) {
      const msg = "ملف الـ APK المختار فارغ أو تالف.";
      setLocalError(msg);
      notify(msg, true);
      return;
    }
    setInspectingFile(true);
    const signal = unmountAbortRef.current?.signal;
    try {
      const arrayBuf = await file.arrayBuffer();
      const localSha256 = await computeArrayBufferSha256Hex(arrayBuf);
      const { serverBase } = await resolveCallableServerBase(void 0, signal);
      if (serverBase === null) {
        throw new Error("يرجى إدخال وحفظ عنوان الخادم المنشور (HTTPS) في إعدادات GitHub Releases أولاً لفحص ورفع ملف الـ APK.");
      }
      const { headers } = getAuthCredentials();
      const { data, status } = await fetchJsonApi(`${serverBase}/api/app-updates/inspect-apk`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/vnd.android.package-archive",
          "X-File-Name": encodeURIComponent(file.name)
        },
        body: file,
        timeoutMs: 6e4,
        parentSignal: signal
      });
      if (!mountedRef.current || signal?.aborted) return;
      if (data?.inspection) {
        const srvInsp = {
          ...data.inspection,
          sha256: data.inspection.sha256 || localSha256
        };
        setInspection(srvInsp);
        if (!srvInsp.canPublish && srvInsp.errors?.length > 0) {
          setLocalError(srvInsp.errors[0]);
          notify(srvInsp.errors[0], true);
        } else {
          if (!description.trim()) {
            setDescription(`تحديث تطبيق Sami الإصدار ${srvInsp.versionName} — تحسينات في الأداء والاستقرار.`);
          }
          notify(`تم فحص حزمة APK (v${srvInsp.versionName} - كود ${srvInsp.versionCode}) بنجاح ✅`);
        }
      } else {
        const errMsg = translateNetworkOrHttpErrorAr(null, status, data?.error || "تعذر قراءة بيانات ملف الـ APK المختار");
        setLocalError(errMsg);
        notify(errMsg, true);
      }
    } catch (err) {
      if (err?.isCancelled || !mountedRef.current) return;
      const msg = translateNetworkOrHttpErrorAr(err);
      setLocalError(msg);
      notify(msg, true);
    } finally {
      if (mountedRef.current) {
        setInspectingFile(false);
      }
    }
  };
  const handleFileInputChange = (e) => {
    const file = e.target?.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    inspectSelectedApk(file);
  };
  const handleStartUploadAndPublish = () => {
    if (!selectedFile || !inspection) {
      notify("يرجى اختيار ملف APK صالح أولاً", true);
      return;
    }
    if (!inspection.canPublish) {
      notify(inspection.errors[0] || "لا يمكن نشر هذا الملف لوجود تعارض في الإصدار أو التوقيع", true);
      return;
    }
    if (!description.trim()) {
      notify("يرجى كتابة وصف مختصر للتحديث قبل النشر", true);
      return;
    }
    const serverBase = getSamiServerBaseUrl();
    if (isLocalAndroidOrigin && !serverBase) {
      const msg = "يرجى حفظ عنوان الخادم المنشور (HTTPS) في إعدادات GitHub Releases أولاً قبل النشر.";
      setUploadError(msg);
      notify(msg, true);
      return;
    }
    const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { headers } = getAuthCredentials();
    setUploading(true);
    setUploadError(null);
    setUploadSuccessInfo(null);
    setUploadPercent(0);
    setUploadedBytes(0);
    setUploadTotalBytes(selectedFile.size);
    setUploadSpeedBps(0);
    setUploadPhaseText("جارٍ رفع ملف الـ APK من جهازك إلى الخادم (0%)...");
    const xhr = new XMLHttpRequest();
    activeXhrRef.current = xhr;
    let speedStartMs = Date.now();
    let speedStartBytes = 0;
    pollTimerRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const { ok, data } = await fetchJsonApi(
          `${serverBase}/api/app-updates/upload-status/${encodeURIComponent(uploadId)}`,
          {
            method: "GET",
            headers,
            timeoutMs: 8e3,
            parentSignal: unmountAbortRef.current?.signal
          }
        );
        if (!ok || !mountedRef.current) return;
        const job = data?.job;
        if (!job) return;
        if (job.phase !== "receiving_apk" && typeof job.percent === "number") {
          const mappedPct = Math.max(50, Math.min(99, Math.round(50 + job.percent / 100 * 50)));
          setUploadPercent((prev) => Math.max(prev, mappedPct));
          if (job.phaseLabelAr) {
            setUploadPhaseText(job.phaseLabelAr);
          }
        }
      } catch {
      }
    }, 1e3);
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !mountedRef.current) return;
      setUploadedBytes(ev.loaded);
      setUploadTotalBytes(ev.total);
      const now = Date.now();
      if (now - speedStartMs >= 400) {
        const bps = Math.round((ev.loaded - speedStartBytes) * 1e3 / (now - speedStartMs));
        setUploadSpeedBps(Math.max(0, bps));
        speedStartMs = now;
        speedStartBytes = ev.loaded;
      }
      const transferRatio = ev.total > 0 ? ev.loaded / ev.total : 0;
      const uiPct = Math.min(50, Math.round(transferRatio * 50));
      setUploadPercent(uiPct);
      if (ev.loaded < ev.total) {
        setUploadPhaseText(`جارٍ رفع حزمة الـ APK (${Math.round(transferRatio * 100)}% من النقل)...`);
      } else {
        setUploadSpeedBps(0);
        setUploadPhaseText("اكتمل إرسال الملف للخادم — جارٍ الرفع والتحقق على GitHub Releases...");
      }
    };
    xhr.onload = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      activeXhrRef.current = null;
      if (!mountedRef.current) return;
      setUploading(false);
      setUploadSpeedBps(0);
      let resp = {};
      try {
        resp = JSON.parse(xhr.responseText || "{}");
      } catch {
      }
      if (xhr.status >= 200 && xhr.status < 300 && resp.success && resp.update) {
        setUploadPercent(100);
        setUploadedBytes(selectedFile.size);
        setUploadPhaseText("اكتمل الرفع والتحقق ونشر الإصدار على GitHub Releases وFirestore بنجاح (100%)");
        setUploadSuccessInfo(resp);
        setCurrentPublished(resp.update);
        setSelectedFile(null);
        setInspection(null);
        notify(resp.message || "تم نشر التحديث بنجاح 🚀");
        loadCloudStatusAndHistory({ showToastOnError: false });
      } else {
        const msg = translateNetworkOrHttpErrorAr(null, xhr.status, resp?.error);
        setUploadError(msg);
        setUploadPhaseText("توقف النشر بسبب خطأ");
        notify(msg, true);
      }
    };
    xhr.onerror = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      activeXhrRef.current = null;
      if (!mountedRef.current) return;
      setUploading(false);
      setUploadSpeedBps(0);
      const msg = "انقطع الاتصال بالشبكة أثناء رفع ملف الـ APK عبر HTTPS. يمكنك الضغط على «إعادة المحاولة» دون إعادة اختيار الملف.";
      setUploadError(msg);
      setUploadPhaseText("فشل الاتصال أثناء الرفع");
      notify(msg, true);
    };
    xhr.onabort = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      activeXhrRef.current = null;
      if (!mountedRef.current) return;
      setUploading(false);
      setUploadSpeedBps(0);
      setUploadPercent(0);
      setUploadedBytes(0);
      setUploadPhaseText("تم إلغاء عملية الرفع بناءً على طلبك");
      notify("تم إلغاء رفع ملف الـ APK");
    };
    xhr.open("POST", `${serverBase}/api/app-updates/upload-release`, true);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.setRequestHeader("Content-Type", "application/vnd.android.package-archive");
    xhr.setRequestHeader("X-Upload-Id", uploadId);
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(selectedFile.name));
    xhr.setRequestHeader("X-Expected-Sha256", inspection.sha256);
    xhr.setRequestHeader("X-Description-B64", encodeUtf8Base64(description.trim()));
    xhr.setRequestHeader("X-Is-Mandatory", isMandatory ? "true" : "false");
    xhr.send(selectedFile);
  };
  const handleCancelActiveUpload = () => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
    }
  };
  const handleToggleVisibility = async () => {
    if (!currentPublished || actionBusy) return;
    setActionBusy(true);
    const signal = unmountAbortRef.current?.signal;
    try {
      const { serverBase } = await resolveCallableServerBase(void 0, signal);
      if (serverBase === null) {
        throw new Error("يرجى حفظ عنوان الخادم المنشور (HTTPS) في الإعدادات أولاً.");
      }
      const { headers } = getAuthCredentials();
      const nextActive = !(currentPublished.isActive === true && !currentPublished.isHidden);
      const { ok, status, data } = await fetchJsonApi(`${serverBase}/api/app-updates/toggle`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextActive,
          versionCode: currentPublished.versionCode
        }),
        timeoutMs: 15e3,
        parentSignal: signal
      });
      if (!mountedRef.current || signal?.aborted) return;
      if (!ok || !data.success) {
        throw new Error(translateNetworkOrHttpErrorAr(null, status, data.error || "تعذر تغيير حالة ظهور الإصدار"));
      }
      setCurrentPublished(data.update);
      notify(data.message || "تم تحديث حالة الإصدار بنجاح");
      loadCloudStatusAndHistory({ showToastOnError: false });
    } catch (err) {
      if (err?.isCancelled || !mountedRef.current) return;
      notify(translateNetworkOrHttpErrorAr(err), true);
    } finally {
      if (mountedRef.current) {
        setActionBusy(false);
      }
    }
  };
  const handleRollbackToVersion = async (targetVersionCode) => {
    if (actionBusy) return;
    setActionBusy(true);
    const signal = unmountAbortRef.current?.signal;
    try {
      const { serverBase } = await resolveCallableServerBase(void 0, signal);
      if (serverBase === null) {
        throw new Error("يرجى حفظ عنوان الخادم المنشور (HTTPS) في الإعدادات أولاً.");
      }
      const { headers } = getAuthCredentials();
      const { ok, status, data } = await fetchJsonApi(`${serverBase}/api/app-updates/rollback`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ versionCode: targetVersionCode }),
        timeoutMs: 2e4,
        parentSignal: signal
      });
      if (!mountedRef.current || signal?.aborted) return;
      if (!ok || !data.success) {
        throw new Error(translateNetworkOrHttpErrorAr(null, status, data.error || "تعذر الرجوع إلى الإصدار المحدد"));
      }
      setCurrentPublished(data.update);
      notify(data.message || "تم الرجوع إلى الإصدار السابق بنجاح");
      loadCloudStatusAndHistory({ showToastOnError: false });
    } catch (err) {
      if (err?.isCancelled || !mountedRef.current) return;
      notify(translateNetworkOrHttpErrorAr(err), true);
    } finally {
      if (mountedRef.current) {
        setActionBusy(false);
      }
    }
  };
  const isCurrentActive = Boolean(
    currentPublished && currentPublished.isActive === true && !currentPublished.isHidden && currentPublished.storageSource === "github_releases"
  );
  const hasSavedServerToken = Boolean(githubStatus?.hasToken || vaultInfo?.hasSavedToken);
  const isGitHubReady = Boolean(githubStatus?.canPublishReleases || githubStatus?.configured && hasSavedServerToken);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { dir: "rtl", className: "space-y-4 text-right", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#121824] border border-amber-500/40 rounded-2xl p-5 space-y-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "text-sm font-black text-amber-300", children: "نظام التحديثات السحابي عبر GitHub Releases" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-400 mt-0.5", children: "رفع مباشر لملف الـ APK، فحص آلي للتوقيع وSHA-256، وتثبيت داخلي دون روابط يدوية" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            disabled: loadingStatus,
            onClick: () => loadCloudStatusAndHistory({ showToastOnError: true }),
            className: "px-3 py-1.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 transition cursor-pointer disabled:opacity-50",
            children: loadingStatus ? "جارٍ التحديث..." : "تحديث الحالة"
          }
        )
      ] }),
      (connectionState === "error" || connectionState === "needs_server_url") && connectionErrorAr && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          className: `rounded-xl p-3.5 border text-xs space-y-2.5 ${connectionState === "needs_server_url" ? "bg-amber-500/10 border-amber-500/40 text-amber-200" : "bg-rose-500/10 border-rose-500/40 text-rose-200"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-black", children: connectionState === "needs_server_url" ? "مطلوب تحديد عنوان الخادم المنشور (HTTPS)" : "تنبيه اتصال بالخادم" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  disabled: loadingStatus,
                  onClick: () => loadCloudStatusAndHistory({ showToastOnError: true }),
                  className: "shrink-0 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] transition cursor-pointer disabled:opacity-50",
                  children: loadingStatus ? "جارٍ الاتصال..." : "إعادة المحاولة"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-[11px] leading-relaxed", children: connectionErrorAr })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400", children: "المستودع المستخدم حالياً:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              dir: "ltr",
              className: `font-bold font-['JetBrains_Mono',monospace] truncate ${githubStatus?.fullName ? "text-slate-100" : "text-slate-500"}`,
              children: githubStatus?.fullName || "غير محدد بعد"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400", children: "حالة إعدادات GitHub:" }),
          loadingStatus && connectionState === "connecting" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-black text-amber-300", children: "جارٍ قراءة الإعدادات السحابية..." }) : githubStatus?.liveTested && githubStatus?.canPublishReleases ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "font-black text-emerald-400", children: [
            "متصل وجاهز للنشر (",
            githubStatus.isPrivate ? "خاص" : "عام",
            ") ✓"
          ] }) : isGitHubReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-black text-emerald-400", children: "الإعدادات والتوكن محفوظان ✓" }) : githubStatus?.exists ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-black text-amber-400", children: "يلزم حفظ التوكن أو اختبار الصلاحية" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-black text-rose-400", children: "غير مكتمل" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400", children: "النسخة المثبتة على هذا الجهاز:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { dir: "ltr", className: "font-bold text-slate-200 font-['JetBrains_Mono',monospace] tabular-nums", children: [
            "v",
            installedApp.versionName,
            " (Code ",
            installedApp.versionCode,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f17] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400", children: "الإصدار النشط للمستخدمين:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `font-black ${isCurrentActive ? "text-emerald-400" : "text-slate-400"}`, children: isCurrentActive && currentPublished ? `v${currentPublished.versionName} (Code ${currentPublished.versionCode})` : "لا يوجد تحديث نشط حالياً" })
        ] })
      ] }),
      signingKeyInfo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f17] border border-slate-800 rounded-xl p-3 text-[11px] space-y-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-slate-400 font-bold", children: "شهادة توقيع Sami المعتمدة:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: signingKeyInfo.available ? "text-emerald-400 font-black" : "text-rose-400 font-black", children: signingKeyInfo.available ? "متوفرة ومطابقة ✓" : "مفقودة ✗" })
        ] }),
        signingKeyInfo.sha256Fingerprint && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            dir: "ltr",
            className: "text-[10px] text-slate-400 font-['JetBrains_Mono',monospace] break-all",
            children: [
              "SHA-256: ",
              signingKeyInfo.sha256Fingerprint
            ]
          }
        )
      ] }),
      githubStatus && !isGitHubReady && (githubStatus.setupInstructionsAr || githubStatus.error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-amber-500/10 border border-amber-500/40 rounded-xl p-3.5 text-xs space-y-1.5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-black text-amber-300", children: "تنبيه إعداد GitHub Releases:" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-slate-300 leading-relaxed text-[11px]", children: githubStatus.setupInstructionsAr || githubStatus.error })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#121824] border border-amber-400/30 rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setSettingsOpen((prev) => !prev),
          className: "w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-right hover:bg-slate-800/50 transition cursor-pointer",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1 min-w-0", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs sm:text-sm font-black text-amber-300", children: "⚙️ إعدادات GitHub Releases" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-wrap items-center gap-2 text-[11px] text-slate-400", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                  "المستودع الحالي:",
                  " ",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { dir: "ltr", className: "text-slate-200 font-['JetBrains_Mono',monospace]", children: githubStatus?.fullName || "غير محدد" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "·" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: hasSavedServerToken ? "text-emerald-400 font-bold" : "text-amber-400 font-bold", children: hasSavedServerToken ? "التوكن محفوظ ✓" : "التوكن غير محفوظ" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shrink-0 px-3 py-1.5 rounded-lg bg-[#0b0f17] border border-slate-700 text-[11px] font-bold text-amber-300", children: settingsOpen ? "إخفاء ▲" : "تعديل الإعدادات ▼" })
          ]
        }
      ),
      settingsOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 sm:p-5 border-t border-slate-800/80 space-y-4 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f17] border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-slate-400", children: "المستودع المحفوظ في السحابة" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                dir: "ltr",
                className: "block mt-0.5 font-black text-slate-100 font-['JetBrains_Mono',monospace] break-all",
                children: githubStatus?.fullName || "لم يتم الحفظ بعد"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-slate-400", children: "حالة الاتصال بـ GitHub" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: `block mt-0.5 font-black ${githubStatus?.liveTested && githubStatus?.canPublishReleases ? "text-emerald-400" : isGitHubReady ? "text-amber-300" : "text-rose-400"}`,
                children: githubStatus?.liveTested && githubStatus?.canPublishReleases ? `متصل (${githubStatus.isPrivate ? "مستودع خاص" : "مستودع عام"}) ✓` : isGitHubReady ? "محفوظ سحابياً — اضغط «اختبار اتصال GitHub» للتحقق الحي" : "غير متصل"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-slate-400", children: "حالة التوكن السري" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: `block mt-0.5 font-black ${hasSavedServerToken ? "text-emerald-400" : "text-amber-400"}`,
                children: hasSavedServerToken ? "التوكن محفوظ ✓" : "غير محفوظ بعد"
              }
            )
          ] })
        ] }),
        (isLocalAndroidOrigin || Boolean(serverUrlInput)) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "block text-slate-300 font-bold mb-1.5", children: [
            "عنوان خادم التحديثات المنشور (",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dir: "ltr", className: "text-amber-300 font-['JetBrains_Mono',monospace]", children: "HTTPS" }),
            ")"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "url",
              dir: "ltr",
              disabled: savingSettings || uploading,
              value: serverUrlInput,
              onChange: (e) => setServerUrlInput(e.target.value),
              placeholder: "https://your-deployed-sami-server.run.app",
              autoComplete: "off",
              spellCheck: false,
              className: "w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-[11px] text-slate-400 mt-1 leading-relaxed", children: "يُستخدم للاتصال المباشر بالخادم الفعلي المنشور عبر HTTPS من تطبيق الهاتف (يرفض عناوين localhost ومعاينة AI Studio تلقائياً)." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "block text-slate-300 font-bold mb-1.5", children: [
              "1. ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dir: "ltr", className: "font-['JetBrains_Mono',monospace] text-amber-300", children: "GITHUB_OWNER" }),
              " ",
              "(اسم مالك المستودع)"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "text",
                dir: "ltr",
                disabled: savingSettings || uploading,
                value: ownerInput,
                onChange: (e) => setOwnerInput(e.target.value),
                placeholder: "owner-username",
                autoComplete: "off",
                spellCheck: false,
                className: "w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "block text-slate-300 font-bold mb-1.5", children: [
              "2. ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dir: "ltr", className: "font-['JetBrains_Mono',monospace] text-amber-300", children: "GITHUB_REPO" }),
              " ",
              "(اسم المستودع)"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "text",
                dir: "ltr",
                disabled: savingSettings || uploading,
                value: repoInput,
                onChange: (e) => setRepoInput(e.target.value),
                placeholder: "repository-name",
                autoComplete: "off",
                spellCheck: false,
                className: "w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "block text-slate-300 font-bold mb-1.5", children: [
            "3. ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dir: "ltr", className: "font-['JetBrains_Mono',monospace] text-amber-300", children: "GITHUB_TOKEN" }),
            " ",
            "(التوكن السري — صلاحية Contents: Read and write)"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: showToken ? "text" : "password",
                dir: "ltr",
                disabled: savingSettings || uploading,
                value: tokenInput,
                onChange: (e) => setTokenInput(e.target.value),
                placeholder: hasSavedServerToken ? "التوكن محفوظ — اتركه فارغاً للإبقاء عليه أو أدخل توكن جديداً لاستبداله" : "github_pat_...",
                autoComplete: "new-password",
                spellCheck: false,
                className: "flex-1 min-w-0 bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-amber-400"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                disabled: !tokenInput || savingSettings,
                onClick: () => setShowToken((prev) => !prev),
                className: "shrink-0 px-3.5 py-3 rounded-xl bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs transition cursor-pointer disabled:opacity-40",
                children: showToken ? "إخفاء" : "إظهار"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-[11px] text-slate-400 mt-1.5 leading-relaxed", children: "يُحفظ اسما المالك والمستودع بشكل دائم في السحابة (Firestore)، بينما يُحفظ التوكن في مخزن الأسرار السحابي للخادم فقط ولا يُعاد للواجهة أبداً." })
        ] }),
        settingsFeedback && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            className: `rounded-xl p-3 border text-xs font-bold leading-relaxed ${settingsFeedback.ok ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border-rose-500/40 text-rose-300"}`,
            children: settingsFeedback.text
          }
        ),
        vaultInfo?.hostingVaultNoticeAr && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-[#0b0f17] border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 leading-relaxed", children: vaultInfo.hostingVaultNoticeAr }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              disabled: savingSettings || testingConnection || uploading,
              onClick: handleSaveGitHubSettings,
              className: "w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer",
              children: savingSettings ? "جارٍ الحفظ السحابي الدائم..." : "حفظ إعدادات GitHub"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              disabled: testingConnection || savingSettings || uploading,
              onClick: handleTestGitHubConnection,
              className: "w-full py-3 px-4 rounded-xl bg-[#0b0f17] hover:bg-slate-800 disabled:opacity-40 border border-amber-400/40 text-amber-300 font-black text-xs transition cursor-pointer",
              children: testingConnection ? "جارٍ اختبار الاتصال..." : "اختبار اتصال GitHub"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#121824] border border-slate-800 rounded-2xl p-5 space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { className: "text-xs font-black text-amber-400", children: [
          "رفع ونشر إصدار APK جديد (يجب أن يكون كود الإصدار أكبر من ",
          effectiveMinVersionCode,
          ")"
        ] }),
        currentUser?.displayName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[11px] text-slate-400", children: [
          "المسؤول: ",
          currentUser.displayName
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          ref: fileInputRef,
          type: "file",
          accept: ".apk,application/vnd.android.package-archive",
          onChange: handleFileInputChange,
          className: "hidden"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          disabled: uploading || inspectingFile,
          onClick: handleChooseApkClick,
          className: "w-full py-4 px-4 rounded-xl bg-[#0b101c] hover:bg-[#101829] border-2 border-dashed border-amber-400/50 hover:border-amber-400 text-amber-300 font-black text-sm flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "📦 اختيار ملف APK ورفعه" })
        }
      ),
      inspectingFile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-[#0b0f17] border border-amber-400/30 rounded-xl p-3.5 text-xs text-amber-300 font-bold text-center", children: "جارٍ قراءة حزمة الـ APK واستخراج البيانات وشهادة التوقيع وحساب SHA-256..." }),
      localError && !inspection && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-rose-500/10 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-300 font-bold", children: localError }),
      inspection && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          className: `rounded-xl p-4 border space-y-3 text-xs ${inspection.canPublish ? "bg-[#0b111d] border-emerald-500/40" : "bg-[#140c12] border-rose-500/40"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "font-black text-slate-100", children: "بيانات حزمة الـ APK المستخرجة:" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "span",
                {
                  className: `text-[11px] font-black px-2.5 py-0.5 rounded-md border ${inspection.canPublish ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-rose-500/15 border-rose-500/40 text-rose-300"}`,
                  children: inspection.canPublish ? "جاهز ومطابق للنشر ✓" : "مرفوض للنشر ✗"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-2 gap-2.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-slate-400", children: "معرّف التطبيق (applicationId)" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    dir: "ltr",
                    className: `block font-bold font-['JetBrains_Mono',monospace] text-[11px] mt-0.5 break-all ${inspection.applicationIdMatchesSami ? "text-emerald-400" : "text-rose-400"}`,
                    children: inspection.applicationId || "غير معروف"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-slate-400", children: "الإصدار وكود البناء" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "span",
                  {
                    dir: "ltr",
                    className: `block font-black font-['JetBrains_Mono',monospace] tabular-nums mt-0.5 ${inspection.isHigherThanPublished ? "text-amber-300" : "text-rose-400"}`,
                    children: [
                      "v",
                      inspection.versionName || "?",
                      " (Code ",
                      inspection.versionCode || 0,
                      ")"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-slate-400", children: "حجم ملف الـ APK" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "span",
                  {
                    dir: "ltr",
                    className: "block font-bold text-slate-200 font-['JetBrains_Mono',monospace] tabular-nums mt-0.5",
                    children: [
                      formatBytesAr(inspection.fileSize),
                      " (",
                      inspection.fileSize.toLocaleString(),
                      " B)"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block text-[10px] text-slate-400", children: "تطابق شهادة التوقيع" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    className: `block font-black mt-0.5 ${inspection.signatureMatchesOriginal ? "text-emerald-400" : "text-rose-400"}`,
                    children: inspection.signatureMatchesOriginal ? `مطابق لشهادة Sami (${inspection.signingCertificate?.scheme.toUpperCase()}) ✓` : "غير مطابق أو غير موقّع ✗"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#080c14] p-2.5 rounded-lg border border-slate-800/80 space-y-1 text-[10px]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-slate-400", children: "بصمة الملف (SHA-256):" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dir: "ltr", className: "text-slate-200 font-['JetBrains_Mono',monospace] break-all", children: inspection.sha256 }),
              inspection.signingCertificate?.sha256Fingerprint && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-slate-400 pt-1", children: "بصمة شهادة التوقيع (X.509 SHA-256):" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dir: "ltr", className: "text-amber-300 font-['JetBrains_Mono',monospace] break-all", children: inspection.signingCertificate.sha256Fingerprint })
              ] })
            ] }),
            inspection.errors?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-rose-500/15 border border-rose-500/40 rounded-lg p-3 space-y-1 text-rose-200", children: inspection.errors.map((errStr, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "font-bold", children: [
              "• ",
              errStr
            ] }, i)) })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-3 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block text-slate-300 font-bold mb-1.5", children: "نوع التحديث للمستخدمين:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                disabled: uploading,
                onClick: () => setIsMandatory(false),
                className: `p-3 rounded-xl border text-right transition cursor-pointer ${!isMandatory ? "bg-amber-400/15 border-amber-400 text-amber-200" : "bg-[#0b0f17] border-slate-800 text-slate-400 hover:border-slate-700"}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-black text-xs", children: "تحديث اختياري مع إمكانية اختيار «لاحقًا»" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[10px] opacity-80 mt-0.5", children: "يسمح للمستخدم بتأجيل التحديث ومتابعة التصفح" })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                disabled: uploading,
                onClick: () => setIsMandatory(true),
                className: `p-3 rounded-xl border text-right transition cursor-pointer ${isMandatory ? "bg-rose-500/15 border-rose-500 text-rose-200" : "bg-[#0b0f17] border-slate-800 text-slate-400 hover:border-slate-700"}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-black text-xs", children: "تحديث إلزامي" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-[10px] opacity-80 mt-0.5", children: "يلزم المستخدم بتحميل وتثبيت التحديث قبل المتابعة" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "block text-slate-300 font-bold mb-1.5", children: "وصف التحديث وما الجديد:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              rows: 3,
              disabled: uploading,
              value: description,
              onChange: (e) => setDescription(e.target.value),
              placeholder: "اكتب ميزات وتحسينات هذا الإصدار التي ستظهر للمستخدمين داخل نافذة التحديث...",
              className: "w-full bg-[#0b0f17] border border-slate-700 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
            }
          )
        ] })
      ] }),
      (uploading || uploadError || uploadSuccessInfo) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              className: `font-black ${uploadError ? "text-rose-400" : uploadSuccessInfo ? "text-emerald-400" : "text-amber-300"}`,
              children: uploadPhaseText
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { dir: "ltr", className: "font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums", children: [
            uploadPercent,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          GoldProgressBar,
          {
            percent: uploadPercent,
            variant: uploadError ? "rose" : uploadSuccessInfo ? "emerald" : "gold"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between text-[11px] text-slate-400 font-['JetBrains_Mono',monospace] tabular-nums", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { dir: "ltr", children: [
            formatBytesAr(uploadedBytes),
            " / ",
            formatBytesAr(uploadTotalBytes)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dir: "ltr", className: "text-amber-300", children: uploading && uploadSpeedBps > 0 ? formatSpeedAr(uploadSpeedBps) : "" })
        ] }),
        uploadError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-300 font-bold leading-relaxed", children: uploadError }),
        uploadSuccessInfo?.githubRelease && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-200 space-y-1 text-[11px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "font-black", children: [
            "✓ تم النشر رسمياً على GitHub Releases (",
            uploadSuccessInfo.githubRelease.releaseTag,
            ") وحفظ السجل في Firestore!"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { dir: "ltr", className: "text-[10px] font-['JetBrains_Mono',monospace] text-emerald-300/90 break-all", children: [
            "Asset: ",
            uploadSuccessInfo.githubRelease.assetName,
            " | Verified SHA-256: ",
            uploadSuccessInfo.githubRelease.sha256
          ] })
        ] }),
        uploading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: handleCancelActiveUpload,
            className: "w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-black text-xs transition cursor-pointer",
            children: "إلغاء الرفع"
          }
        ),
        !uploading && uploadError && selectedFile && inspection?.canPublish && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: handleStartUploadAndPublish,
            className: "w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer",
            children: "إعادة المحاولة لرفع ونشر الملف"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-2 pt-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            disabled: uploading || inspectingFile || !selectedFile || !inspection?.canPublish,
            onClick: handleStartUploadAndPublish,
            className: "w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: uploading ? "جارٍ الرفع والتحقق والنشر..." : "رفع ونشر التحديث عبر GitHub Releases 🚀" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => setShowPreviewModal(true),
              className: "flex-1 py-2.5 rounded-xl bg-[#0b0f17] hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-400/30 transition cursor-pointer",
              children: "معاينة نافذة التحديث للمستخدم"
            }
          ),
          currentPublished && currentPublished.storageSource === "github_releases" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              disabled: actionBusy || uploading,
              onClick: handleToggleVisibility,
              className: `flex-1 py-2.5 rounded-xl font-black text-xs border transition cursor-pointer disabled:opacity-50 ${isCurrentActive ? "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300" : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300"}`,
              children: isCurrentActive ? "⏸️ إيقاف الإصدار مؤقتاً" : "▶️ تفعيل الإصدار للمستخدمين"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#121824] border border-slate-800 rounded-2xl p-5 space-y-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-black text-amber-400", children: "سجل الإصدارات المنشورة والرجوع لإصدار سابق (Rollback)" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[11px] text-slate-400 font-['JetBrains_Mono',monospace] tabular-nums", children: [
          historyList.length,
          " إصدار"
        ] })
      ] }),
      historyList.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-slate-400 py-2", children: "لا توجد سجلات إصدارات محفوظة بعد." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-y-2 max-h-72 overflow-y-auto", children: historyList.map((item) => {
        const isItemActive = item.isActive === true && !item.isHidden && currentPublished?.versionCode === item.versionCode && item.storageSource === "github_releases";
        const isGitHubBacked = item.storageSource === "github_releases" && Boolean(item.sha256);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "bg-[#0b0f17] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-0.5", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                    "span",
                    {
                      dir: "ltr",
                      className: "font-black text-slate-100 font-['JetBrains_Mono',monospace] tabular-nums",
                      children: [
                        "v",
                        item.versionName,
                        " (Code ",
                        item.versionCode,
                        ")"
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "span",
                    {
                      className: `text-[10px] font-black px-2 py-0.5 rounded border ${isItemActive ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : isGitHubBacked ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-900 border-slate-800 text-slate-500"}`,
                      children: isItemActive ? "منشور ونشط" : isGitHubBacked ? "متوقف (GitHub Release)" : "سجل قديم (متوقف)"
                    }
                  ),
                  item.releaseTag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "span",
                    {
                      dir: "ltr",
                      className: "text-[10px] text-amber-300 font-['JetBrains_Mono',monospace]",
                      children: item.releaseTag
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-[11px] text-slate-400", children: [
                  item.fileSize ? `${formatBytesAr(item.fileSize)} • ` : "",
                  item.isMandatory ? "إلزامي" : "اختياري",
                  item.description ? ` • ${item.description.slice(0, 70)}` : ""
                ] })
              ] }),
              isGitHubBacked && !isItemActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  disabled: actionBusy || uploading,
                  onClick: () => handleRollbackToVersion(item.versionCode),
                  className: "px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-black text-[11px] transition cursor-pointer disabled:opacity-50",
                  children: "اعتماد هذا الإصدار"
                }
              )
            ]
          },
          `${item.versionCode}_${item.id}`
        );
      }) })
    ] }),
    showPreviewModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SamiUserUpdateModal,
      {
        isOpen: showPreviewModal,
        isPreview: true,
        onDismiss: () => setShowPreviewModal(false),
        config: inspection ? {
          versionName: inspection.versionName || "1.3.2",
          versionCode: inspection.versionCode || effectiveMinVersionCode + 1,
          description: description.trim() || "تحديث تجريبي للمعاينة داخل لوحة الإدارة",
          fileSize: inspection.fileSize,
          sha256: inspection.sha256,
          signingCertSha256: inspection.signingCertificate?.sha256Fingerprint,
          applicationId: inspection.applicationId,
          storageSource: "github_releases",
          downloadUrl: "",
          isMandatory,
          isActive: true,
          isHidden: false
        } : currentPublished && currentPublished.storageSource === "github_releases" ? currentPublished : {
          versionName: "1.3.2",
          versionCode: effectiveMinVersionCode + 1,
          description: description.trim() || "تحسينات شاملة في الأداء وتثبيت التحديثات المباشر من داخل تطبيق Sami.",
          fileSize: 28 * 1024 * 1024,
          storageSource: "github_releases",
          downloadUrl: "",
          isMandatory,
          isActive: true,
          isHidden: false
        }
      }
    )
  ] });
}
if (typeof window !== "undefined") {
  const w = window;
  w.SamiUserUpdateModal = SamiUserUpdateModal;
  w.SamiAdminUpdatePanel = SamiAdminUpdatePanel;
  w.shouldShowSamiCloudUpdate = shouldShowCloudAppUpdate;
  w.getInstalledSamiAppInfo = getInstalledSamiAppInfo;
  w.getSamiServerBaseUrl = getSamiServerBaseUrl;
}
export {
  SAMI_EXPECTED_APP_ID,
  SAMI_FALLBACK_VERSION_CODE,
  SAMI_FALLBACK_VERSION_NAME,
  SamiAdminUpdatePanel,
  SamiUserUpdateModal,
  getInstalledSamiAppInfo,
  getSamiServerBaseUrl,
  isAndroidLocalAssetOrigin,
  sanitizeProductionServerUrl,
  shouldShowCloudAppUpdate
};
/*! Bundled license information:

jszip/dist/jszip.min.js:
  (*!
  
  JSZip v3.10.2 - A JavaScript class for generating and reading zip files
  <http://stuartk.com/jszip>
  
  (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
  Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.
  
  JSZip uses the library pako released under the MIT license :
  https://github.com/nodeca/pako/blob/main/LICENSE
  *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
