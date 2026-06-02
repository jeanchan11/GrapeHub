"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _defineProperty2 = require("babel-runtime/helpers/defineProperty");

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require("babel-runtime/helpers/inherits");

var _inherits3 = _interopRequireDefault(_inherits2);

var _slicedToArray2 = require("babel-runtime/helpers/slicedToArray");

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

var _toConsumableArray2 = require("babel-runtime/helpers/toConsumableArray");

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _typeof2 = require("babel-runtime/helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var libwebphone = function (e) {
  var t = {};function n(r) {
    if (t[r]) return t[r].exports;var i = t[r] = { i: r, l: !1, exports: {} };return e[r].call(i.exports, i, i.exports, n), i.l = !0, i.exports;
  }return n.m = e, n.c = t, n.d = function (e, t, r) {
    n.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: r });
  }, n.r = function (e) {
    "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 });
  }, n.t = function (e, t) {
    if (1 & t && (e = n(e)), 8 & t) return e;if (4 & t && "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e && e.__esModule) return e;var r = Object.create(null);if (n.r(r), Object.defineProperty(r, "default", { enumerable: !0, value: e }), 2 & t && "string" != typeof e) for (var i in e) {
      n.d(r, i, function (t) {
        return e[t];
      }.bind(null, i));
    }return r;
  }, n.n = function (e) {
    var t = e && e.__esModule ? function () {
      return e.default;
    } : function () {
      return e;
    };return n.d(t, "a", t), t;
  }, n.o = function (e, t) {
    return Object.prototype.hasOwnProperty.call(e, t);
  }, n.p = "dist", n(n.s = 27);
}([function (e, t, n) {
  "use strict";
  var r = n(16);e.exports = { USER_AGENT: "".concat(r.title, " ").concat(r.version), SIP: "sip", SIPS: "sips", causes: { CONNECTION_ERROR: "Connection Error", REQUEST_TIMEOUT: "Request Timeout", SIP_FAILURE_CODE: "SIP Failure Code", INTERNAL_ERROR: "Internal Error", BUSY: "Busy", REJECTED: "Rejected", REDIRECTED: "Redirected", UNAVAILABLE: "Unavailable", NOT_FOUND: "Not Found", ADDRESS_INCOMPLETE: "Address Incomplete", INCOMPATIBLE_SDP: "Incompatible SDP", MISSING_SDP: "Missing SDP", AUTHENTICATION_ERROR: "Authentication Error", BYE: "Terminated", WEBRTC_ERROR: "WebRTC Error", CANCELED: "Canceled", NO_ANSWER: "No Answer", EXPIRES: "Expires", NO_ACK: "No ACK", DIALOG_ERROR: "Dialog Error", USER_DENIED_MEDIA_ACCESS: "User Denied Media Access", BAD_MEDIA_DESCRIPTION: "Bad Media Description", RTP_TIMEOUT: "RTP Timeout" }, SIP_ERROR_CAUSES: { REDIRECTED: [300, 301, 302, 305, 380], BUSY: [486, 600], REJECTED: [403, 603], NOT_FOUND: [404, 604], UNAVAILABLE: [480, 410, 408, 430], ADDRESS_INCOMPLETE: [484, 424], INCOMPATIBLE_SDP: [488, 606], AUTHENTICATION_ERROR: [401, 407] }, ACK: "ACK", BYE: "BYE", CANCEL: "CANCEL", INFO: "INFO", INVITE: "INVITE", MESSAGE: "MESSAGE", NOTIFY: "NOTIFY", OPTIONS: "OPTIONS", REGISTER: "REGISTER", REFER: "REFER", UPDATE: "UPDATE", SUBSCRIBE: "SUBSCRIBE", DTMF_TRANSPORT: { INFO: "INFO", RFC2833: "RFC2833" }, REASON_PHRASE: { 100: "Trying", 180: "Ringing", 181: "Call Is Being Forwarded", 182: "Queued", 183: "Session Progress", 199: "Early Dialog Terminated", 200: "OK", 202: "Accepted", 204: "No Notification", 300: "Multiple Choices", 301: "Moved Permanently", 302: "Moved Temporarily", 305: "Use Proxy", 380: "Alternative Service", 400: "Bad Request", 401: "Unauthorized", 402: "Payment Required", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 406: "Not Acceptable", 407: "Proxy Authentication Required", 408: "Request Timeout", 410: "Gone", 412: "Conditional Request Failed", 413: "Request Entity Too Large", 414: "Request-URI Too Long", 415: "Unsupported Media Type", 416: "Unsupported URI Scheme", 417: "Unknown Resource-Priority", 420: "Bad Extension", 421: "Extension Required", 422: "Session Interval Too Small", 423: "Interval Too Brief", 424: "Bad Location Information", 428: "Use Identity Header", 429: "Provide Referrer Identity", 430: "Flow Failed", 433: "Anonymity Disallowed", 436: "Bad Identity-Info", 437: "Unsupported Certificate", 438: "Invalid Identity Header", 439: "First Hop Lacks Outbound Support", 440: "Max-Breadth Exceeded", 469: "Bad Info Package", 470: "Consent Needed", 478: "Unresolvable Destination", 480: "Temporarily Unavailable", 481: "Call/Transaction Does Not Exist", 482: "Loop Detected", 483: "Too Many Hops", 484: "Address Incomplete", 485: "Ambiguous", 486: "Busy Here", 487: "Request Terminated", 488: "Not Acceptable Here", 489: "Bad Event", 491: "Request Pending", 493: "Undecipherable", 494: "Security Agreement Required", 500: "JsSIP Internal Error", 501: "Not Implemented", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Server Time-out", 505: "Version Not Supported", 513: "Message Too Large", 580: "Precondition Failure", 600: "Busy Everywhere", 603: "Decline", 604: "Does Not Exist Anywhere", 606: "Not Acceptable" }, ALLOWED_METHODS: "INVITE,ACK,CANCEL,BYE,UPDATE,MESSAGE,OPTIONS,REFER,INFO,NOTIFY", ACCEPTED_BODY_TYPES: "application/sdp, application/dtmf-relay", MAX_FORWARDS: 69, SESSION_EXPIRES: 90, MIN_SESSION_EXPIRES: 60, CONNECTION_RECOVERY_MAX_INTERVAL: 30, CONNECTION_RECOVERY_MIN_INTERVAL: 2 };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(13);e.exports = function () {
    function e(t) {
      !function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), t ? (this._debug = i.default("".concat("JsSIP", ":").concat(t)), this._warn = i.default("".concat("JsSIP", ":WARN:").concat(t)), this._error = i.default("".concat("JsSIP", ":ERROR:").concat(t))) : (this._debug = i.default("JsSIP"), this._warn = i.default("".concat("JsSIP", ":WARN")), this._error = i.default("".concat("JsSIP", ":ERROR"))), this._debug.log = console.info.bind(console), this._warn.log = console.warn.bind(console), this._error.log = console.error.bind(console);
    }var t, n, o;return t = e, (n = [{ key: "debug", get: function get() {
        return this._debug;
      } }, { key: "warn", get: function get() {
        return this._warn;
      } }, { key: "error", get: function get() {
        return this._error;
      } }]) && r(t.prototype, n), o && r(t, o), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    var _n2;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n2 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return o(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? o(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n2 && (e = _n2);var r = 0,
            i = function i() {};return { s: i, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e2) {
            throw _e2;
          }, f: i };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var s,
        a = !0,
        l = !1;return { s: function s() {
        _n2 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n2.next();return a = e.done, e;
      }, e: function e(_e3) {
        l = !0, s = _e3;
      }, f: function f() {
        try {
          a || null == _n2.return || _n2.return();
        } finally {
          if (l) throw s;
        }
      } };
  }function o(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }var s = n(0),
      a = n(6),
      l = n(3);t.str_utf8_length = function (e) {
    return unescape(encodeURIComponent(e)).length;
  };var u = t.isFunction = function (e) {
    return void 0 !== e && "[object Function]" === Object.prototype.toString.call(e);
  };t.isString = function (e) {
    return void 0 !== e && "[object String]" === Object.prototype.toString.call(e);
  }, t.isDecimal = function (e) {
    return !isNaN(e) && parseFloat(e) === parseInt(e, 10);
  }, t.isEmpty = function (e) {
    return null === e || "" === e || void 0 === e || Array.isArray(e) && 0 === e.length || "number" == typeof e && isNaN(e);
  }, t.hasMethods = function (e) {
    for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) {
      n[r - 1] = arguments[r];
    }for (var i = 0, o = n; i < o.length; i++) {
      var s = o[i];if (u(e[s])) return !1;
    }return !0;
  };var c = t.createRandomToken = function (e) {
    var t,
        n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 32,
        r = "";for (t = 0; t < e; t++) {
      r += (Math.random() * n | 0).toString(n);
    }return r;
  };t.newTag = function () {
    return c(10);
  }, t.newUUID = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (e) {
      var t = 16 * Math.random() | 0;return ("x" === e ? t : 3 & t | 8).toString(16);
    });
  }, t.hostType = function (e) {
    if (e) return -1 !== (e = l.parse(e, "host")) ? e.host_type : void 0;
  };var d = t.escapeUser = function (e) {
    return encodeURIComponent(decodeURIComponent(e)).replace(/%3A/gi, ":").replace(/%2B/gi, "+").replace(/%3F/gi, "?").replace(/%2F/gi, "/");
  };t.normalizeTarget = function (e, t) {
    if (e) {
      if (e instanceof a) return e;if ("string" == typeof e) {
        var n,
            r,
            i,
            o = e.split("@");switch (o.length) {case 1:
            if (!t) return;n = e, r = t;break;case 2:
            n = o[0], r = o[1];break;default:
            n = o.slice(0, o.length - 1).join("@"), r = o[o.length - 1];}return n = n.replace(/^(sips?|tel):/i, ""), /^[-.()]*\+?[0-9\-.()]+$/.test(n) && (n = n.replace(/[-.()]/g, "")), e = "".concat(s.SIP, ":").concat(d(n), "@").concat(r), (i = a.parse(e)) ? i : void 0;
      }
    }
  }, t.headerize = function (e) {
    var t,
        n = { "Call-Id": "Call-ID", Cseq: "CSeq", "Www-Authenticate": "WWW-Authenticate" },
        r = e.toLowerCase().replace(/_/g, "-").split("-"),
        i = "",
        o = r.length;for (t = 0; t < o; t++) {
      0 !== t && (i += "-"), i += r[t].charAt(0).toUpperCase() + r[t].substring(1);
    }return n[i] && (i = n[i]), i;
  }, t.sipErrorCause = function (e) {
    for (var t in s.SIP_ERROR_CAUSES) {
      if (-1 !== s.SIP_ERROR_CAUSES[t].indexOf(e)) return s.causes[t];
    }return s.causes.SIP_FAILURE_CODE;
  }, t.getRandomTestNetIP = function () {
    return "192.0.2.".concat((e = 1, t = 254, Math.floor(Math.random() * (t - e + 1) + e)));var e, t;
  }, t.calculateMD5 = function (e) {
    function t(e, t) {
      return e << t | e >>> 32 - t;
    }function n(e, t) {
      var n = 2147483648 & e,
          r = 2147483648 & t,
          i = 1073741824 & e,
          o = 1073741824 & t,
          s = (1073741823 & e) + (1073741823 & t);return i & o ? 2147483648 ^ s ^ n ^ r : i | o ? 1073741824 & s ? 3221225472 ^ s ^ n ^ r : 1073741824 ^ s ^ n ^ r : s ^ n ^ r;
    }function r(e, r, i, o, s, a, l) {
      return e = n(e, n(n(function (e, t, n) {
        return e & t | ~e & n;
      }(r, i, o), s), l)), n(t(e, a), r);
    }function i(e, r, i, o, s, a, l) {
      return e = n(e, n(n(function (e, t, n) {
        return e & n | t & ~n;
      }(r, i, o), s), l)), n(t(e, a), r);
    }function o(e, r, i, o, s, a, l) {
      return e = n(e, n(n(function (e, t, n) {
        return e ^ t ^ n;
      }(r, i, o), s), l)), n(t(e, a), r);
    }function s(e, r, i, o, s, a, l) {
      return e = n(e, n(n(function (e, t, n) {
        return t ^ (e | ~n);
      }(r, i, o), s), l)), n(t(e, a), r);
    }function a(e) {
      var t,
          n = "",
          r = "";for (t = 0; t <= 3; t++) {
        n += (r = "0".concat((e >>> 8 * t & 255).toString(16))).substr(r.length - 2, 2);
      }return n;
    }var l, u, c, d, h, f, p, g, _, m;for (l = function (e) {
      for (var t, n = e.length, r = n + 8, i = 16 * ((r - r % 64) / 64 + 1), o = new Array(i - 1), s = 0, a = 0; a < n;) {
        s = a % 4 * 8, o[t = (a - a % 4) / 4] = o[t] | e.charCodeAt(a) << s, a++;
      }return s = a % 4 * 8, o[t = (a - a % 4) / 4] = o[t] | 128 << s, o[i - 2] = n << 3, o[i - 1] = n >>> 29, o;
    }(e = function (e) {
      e = e.replace(/\r\n/g, "\n");for (var t = "", n = 0; n < e.length; n++) {
        var r = e.charCodeAt(n);r < 128 ? t += String.fromCharCode(r) : r > 127 && r < 2048 ? (t += String.fromCharCode(r >> 6 | 192), t += String.fromCharCode(63 & r | 128)) : (t += String.fromCharCode(r >> 12 | 224), t += String.fromCharCode(r >> 6 & 63 | 128), t += String.fromCharCode(63 & r | 128));
      }return t;
    }(e)), p = 1732584193, g = 4023233417, _ = 2562383102, m = 271733878, u = 0; u < l.length; u += 16) {
      c = p, d = g, h = _, f = m, p = r(p, g, _, m, l[u + 0], 7, 3614090360), m = r(m, p, g, _, l[u + 1], 12, 3905402710), _ = r(_, m, p, g, l[u + 2], 17, 606105819), g = r(g, _, m, p, l[u + 3], 22, 3250441966), p = r(p, g, _, m, l[u + 4], 7, 4118548399), m = r(m, p, g, _, l[u + 5], 12, 1200080426), _ = r(_, m, p, g, l[u + 6], 17, 2821735955), g = r(g, _, m, p, l[u + 7], 22, 4249261313), p = r(p, g, _, m, l[u + 8], 7, 1770035416), m = r(m, p, g, _, l[u + 9], 12, 2336552879), _ = r(_, m, p, g, l[u + 10], 17, 4294925233), g = r(g, _, m, p, l[u + 11], 22, 2304563134), p = r(p, g, _, m, l[u + 12], 7, 1804603682), m = r(m, p, g, _, l[u + 13], 12, 4254626195), _ = r(_, m, p, g, l[u + 14], 17, 2792965006), p = i(p, g = r(g, _, m, p, l[u + 15], 22, 1236535329), _, m, l[u + 1], 5, 4129170786), m = i(m, p, g, _, l[u + 6], 9, 3225465664), _ = i(_, m, p, g, l[u + 11], 14, 643717713), g = i(g, _, m, p, l[u + 0], 20, 3921069994), p = i(p, g, _, m, l[u + 5], 5, 3593408605), m = i(m, p, g, _, l[u + 10], 9, 38016083), _ = i(_, m, p, g, l[u + 15], 14, 3634488961), g = i(g, _, m, p, l[u + 4], 20, 3889429448), p = i(p, g, _, m, l[u + 9], 5, 568446438), m = i(m, p, g, _, l[u + 14], 9, 3275163606), _ = i(_, m, p, g, l[u + 3], 14, 4107603335), g = i(g, _, m, p, l[u + 8], 20, 1163531501), p = i(p, g, _, m, l[u + 13], 5, 2850285829), m = i(m, p, g, _, l[u + 2], 9, 4243563512), _ = i(_, m, p, g, l[u + 7], 14, 1735328473), p = o(p, g = i(g, _, m, p, l[u + 12], 20, 2368359562), _, m, l[u + 5], 4, 4294588738), m = o(m, p, g, _, l[u + 8], 11, 2272392833), _ = o(_, m, p, g, l[u + 11], 16, 1839030562), g = o(g, _, m, p, l[u + 14], 23, 4259657740), p = o(p, g, _, m, l[u + 1], 4, 2763975236), m = o(m, p, g, _, l[u + 4], 11, 1272893353), _ = o(_, m, p, g, l[u + 7], 16, 4139469664), g = o(g, _, m, p, l[u + 10], 23, 3200236656), p = o(p, g, _, m, l[u + 13], 4, 681279174), m = o(m, p, g, _, l[u + 0], 11, 3936430074), _ = o(_, m, p, g, l[u + 3], 16, 3572445317), g = o(g, _, m, p, l[u + 6], 23, 76029189), p = o(p, g, _, m, l[u + 9], 4, 3654602809), m = o(m, p, g, _, l[u + 12], 11, 3873151461), _ = o(_, m, p, g, l[u + 15], 16, 530742520), p = s(p, g = o(g, _, m, p, l[u + 2], 23, 3299628645), _, m, l[u + 0], 6, 4096336452), m = s(m, p, g, _, l[u + 7], 10, 1126891415), _ = s(_, m, p, g, l[u + 14], 15, 2878612391), g = s(g, _, m, p, l[u + 5], 21, 4237533241), p = s(p, g, _, m, l[u + 12], 6, 1700485571), m = s(m, p, g, _, l[u + 3], 10, 2399980690), _ = s(_, m, p, g, l[u + 10], 15, 4293915773), g = s(g, _, m, p, l[u + 1], 21, 2240044497), p = s(p, g, _, m, l[u + 8], 6, 1873313359), m = s(m, p, g, _, l[u + 15], 10, 4264355552), _ = s(_, m, p, g, l[u + 6], 15, 2734768916), g = s(g, _, m, p, l[u + 13], 21, 1309151649), p = s(p, g, _, m, l[u + 4], 6, 4149444226), m = s(m, p, g, _, l[u + 11], 10, 3174756917), _ = s(_, m, p, g, l[u + 2], 15, 718787259), g = s(g, _, m, p, l[u + 9], 21, 3951481745), p = n(p, c), g = n(g, d), _ = n(_, h), m = n(m, f);
    }return (a(p) + a(g) + a(_) + a(m)).toLowerCase();
  }, t.closeMediaStream = function (e) {
    if (e) try {
      if (e.getTracks) {
        var t,
            n = i(e.getTracks());try {
          for (n.s(); !(t = n.n()).done;) {
            t.value.stop();
          }
        } catch (e) {
          n.e(e);
        } finally {
          n.f();
        }
      } else {
        var o,
            s = i(e.getAudioTracks());try {
          for (s.s(); !(o = s.n()).done;) {
            o.value.stop();
          }
        } catch (e) {
          s.e(e);
        } finally {
          s.f();
        }var a,
            l = i(e.getVideoTracks());try {
          for (l.s(); !(a = l.n()).done;) {
            a.value.stop();
          }
        } catch (e) {
          l.e(e);
        } finally {
          l.f();
        }
      }
    } catch (t) {
      "function" != typeof e.stop && "object" !== r(e.stop) || e.stop();
    }
  }, t.cloneArray = function (e) {
    return e && e.slice() || [];
  }, t.cloneObject = function (e) {
    var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};return e && Object.assign({}, e) || t;
  };
}, function (e, t, n) {
  "use strict";
  e.exports = function () {
    function e(e) {
      return '"' + e.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\x08/g, "\\b").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\f/g, "\\f").replace(/\r/g, "\\r").replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape) + '"';
    }var t = { parse: function parse(t, r) {
        var i = { CRLF: u, DIGIT: c, ALPHA: d, HEXDIG: h, WSP: f, OCTET: p, DQUOTE: g, SP: _, HTAB: m, alphanum: v, reserved: y, unreserved: b, mark: C, escaped: T, LWS: w, SWS: S, HCOLON: A, TEXT_UTF8_TRIM: E, TEXT_UTF8char: I, UTF8_NONASCII: R, UTF8_CONT: k, LHEX: function LHEX() {
            var e;return null === (e = c()) && (/^[a-f]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[a-f]"))), e;
          }, token: x, token_nodot: M, separators: function separators() {
            var e;return 40 === t.charCodeAt(o) ? (e = "(", o++) : (e = null, l('"("')), null === e && (41 === t.charCodeAt(o) ? (e = ")", o++) : (e = null, l('")"')), null === e && (60 === t.charCodeAt(o) ? (e = "<", o++) : (e = null, l('"<"')), null === e && (62 === t.charCodeAt(o) ? (e = ">", o++) : (e = null, l('">"')), null === e && (64 === t.charCodeAt(o) ? (e = "@", o++) : (e = null, l('"@"')), null === e && (44 === t.charCodeAt(o) ? (e = ",", o++) : (e = null, l('","')), null === e && (59 === t.charCodeAt(o) ? (e = ";", o++) : (e = null, l('";"')), null === e && (58 === t.charCodeAt(o) ? (e = ":", o++) : (e = null, l('":"')), null === e && (92 === t.charCodeAt(o) ? (e = "\\", o++) : (e = null, l('"\\\\"')), null === e && null === (e = g()) && (47 === t.charCodeAt(o) ? (e = "/", o++) : (e = null, l('"/"')), null === e && (91 === t.charCodeAt(o) ? (e = "[", o++) : (e = null, l('"["')), null === e && (93 === t.charCodeAt(o) ? (e = "]", o++) : (e = null, l('"]"')), null === e && (63 === t.charCodeAt(o) ? (e = "?", o++) : (e = null, l('"?"')), null === e && (61 === t.charCodeAt(o) ? (e = "=", o++) : (e = null, l('"="')), null === e && (123 === t.charCodeAt(o) ? (e = "{", o++) : (e = null, l('"{"')), null === e && (125 === t.charCodeAt(o) ? (e = "}", o++) : (e = null, l('"}"')), null === e && null === (e = _()) && (e = m())))))))))))))))), e;
          }, word: D, STAR: O, SLASH: L, EQUAL: P, LPAREN: N, RPAREN: j, RAQUOT: U, LAQUOT: F, COMMA: H, SEMI: q, COLON: z, LDQUOT: G, RDQUOT: V, comment: function e() {
            var t, n, r, i;if (i = o, null !== (t = N())) {
              for (n = [], null === (r = B()) && null === (r = J()) && (r = e()); null !== r;) {
                n.push(r), null === (r = B()) && null === (r = J()) && (r = e());
              }null !== n && null !== (r = j()) ? t = [t, n, r] : (t = null, o = i);
            } else t = null, o = i;return t;
          }, ctext: B, quoted_string: W, quoted_string_clean: Y, qdtext: K, quoted_pair: J, SIP_URI_noparams: Q, SIP_URI: $, uri_scheme: Z, uri_scheme_sips: X, uri_scheme_sip: ee, userinfo: te, user: ne, user_unreserved: re, password: ie, hostport: oe, host: se, hostname: ae, domainlabel: le, toplabel: ue, IPv6reference: ce, IPv6address: de, h16: he, ls32: fe, IPv4address: pe, dec_octet: ge, port: _e, uri_parameters: me, uri_parameter: ve, transport_param: ye, user_param: be, method_param: Ce, ttl_param: Te, maddr_param: we, lr_param: Se, other_param: Ae, pname: Ee, pvalue: Ie, paramchar: Re, param_unreserved: ke, headers: xe, header: Me, hname: De, hvalue: Oe, hnv_unreserved: Le, Request_Response: function Request_Response() {
            var e;return null === (e = ct()) && (e = Pe()), e;
          }, Request_Line: Pe, Request_URI: Ne, absoluteURI: je, hier_part: Ue, net_path: Fe, abs_path: He, opaque_part: qe, uric: ze, uric_no_slash: Ge, path_segments: Ve, segment: Be, param: We, pchar: Ye, scheme: Ke, authority: Je, srvr: Qe, reg_name: $e, query: Ze, SIP_Version: Xe, INVITEm: et, ACKm: tt, OPTIONSm: nt, BYEm: rt, CANCELm: it, REGISTERm: ot, SUBSCRIBEm: st, NOTIFYm: at, REFERm: lt, Method: ut, Status_Line: ct, Status_Code: dt, extension_code: ht, Reason_Phrase: ft, Allow_Events: function Allow_Events() {
            var e, t, n, r, i, s;if (i = o, null !== (e = jt())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = jt()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = jt()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, Call_ID: function Call_ID() {
            var e, n, r, i, s, a;return i = o, s = o, null !== (e = D()) ? (a = o, 64 === t.charCodeAt(o) ? (n = "@", o++) : (n = null, l('"@"')), null !== n && null !== (r = D()) ? n = [n, r] : (n = null, o = a), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = function (e) {
              Hn = t.substring(o, e);
            }(i)), null === e && (o = i), e;
          }, Contact: function Contact() {
            var e, t, n, r, i, s, a;if (i = o, null === (e = O())) if (s = o, null !== (e = pt())) {
              for (t = [], a = o, null !== (n = H()) && null !== (r = pt()) ? n = [n, r] : (n = null, o = a); null !== n;) {
                t.push(n), a = o, null !== (n = H()) && null !== (r = pt()) ? n = [n, r] : (n = null, o = a);
              }null !== t ? e = [e, t] : (e = null, o = s);
            } else e = null, o = s;return null !== e && (e = function (e) {
              var t, n;for (n = Hn.multi_header.length, t = 0; t < n; t++) {
                if (null === Hn.multi_header[t].parsed) {
                  Hn = null;break;
                }
              }Hn = null !== Hn ? Hn.multi_header : -1;
            }()), null === e && (o = i), e;
          }, contact_param: pt, name_addr: gt, display_name: _t, contact_params: mt, c_p_q: vt, c_p_expires: yt, delta_seconds: bt, qvalue: Ct, generic_param: Tt, gen_value: wt, Content_Disposition: function Content_Disposition() {
            var e, t, n, r, i, s;if (i = o, null !== (e = St())) {
              for (t = [], s = o, null !== (n = q()) && null !== (r = At()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = q()) && null !== (r = At()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, disp_type: St, disp_param: At, handling_param: Et, Content_Encoding: function Content_Encoding() {
            var e, t, n, r, i, s;if (i = o, null !== (e = x())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, Content_Length: function Content_Length() {
            var e, t, n;if (n = o, null !== (t = c())) for (e = []; null !== t;) {
              e.push(t), t = c();
            } else e = null;return null !== e && (e = void (Hn = parseInt(e.join("")))), null === e && (o = n), e;
          }, Content_Type: function Content_Type() {
            var e, n;return n = o, null !== (e = It()) && (e = function (e) {
              Hn = t.substring(o, e);
            }(n)), null === e && (o = n), e;
          }, media_type: It, m_type: Rt, discrete_type: kt, composite_type: xt, extension_token: Mt, x_token: Dt, m_subtype: Ot, m_parameter: Lt, m_value: Pt, CSeq: function CSeq() {
            var e, t, n, r;return r = o, null !== (e = Nt()) && null !== (t = w()) && null !== (n = ut()) ? e = [e, t, n] : (e = null, o = r), e;
          }, CSeq_value: Nt, Expires: function Expires() {
            var e, t;return t = o, null !== (e = bt()) && (e = void (Hn = e)), null === e && (o = t), e;
          }, Event: function Event() {
            var e, t, n, r, i, s, a, l;if (i = o, s = o, null !== (e = jt())) {
              for (t = [], a = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = a); null !== n;) {
                t.push(n), a = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = a);
              }null !== t ? e = [e, t] : (e = null, o = s);
            } else e = null, o = s;return null !== e && (l = e[0], e = void (Hn.event = l.join("").toLowerCase())), null === e && (o = i), e;
          }, event_type: jt, From: function From() {
            var e, t, n, r, i, s, a;if (i = o, s = o, null === (e = Q()) && (e = gt()), null !== e) {
              for (t = [], a = o, null !== (n = q()) && null !== (r = Ut()) ? n = [n, r] : (n = null, o = a); null !== n;) {
                t.push(n), a = o, null !== (n = q()) && null !== (r = Ut()) ? n = [n, r] : (n = null, o = a);
              }null !== t ? e = [e, t] : (e = null, o = s);
            } else e = null, o = s;return null !== e && (e = function (e) {
              var t = Hn.tag;try {
                Hn = new Fn(Hn.uri, Hn.display_name, Hn.params), t && Hn.setParam("tag", t);
              } catch (e) {
                Hn = -1;
              }
            }()), null === e && (o = i), e;
          }, from_param: Ut, tag_param: Ft, Max_Forwards: function Max_Forwards() {
            var e, t, n;if (n = o, null !== (t = c())) for (e = []; null !== t;) {
              e.push(t), t = c();
            } else e = null;return null !== e && (e = void (Hn = parseInt(e.join("")))), null === e && (o = n), e;
          }, Min_Expires: function Min_Expires() {
            var e, t;return t = o, null !== (e = bt()) && (e = void (Hn = e)), null === e && (o = t), e;
          }, Name_Addr_Header: function Name_Addr_Header() {
            var e, t, n, r, i, s, a, l, u, c;for (l = o, u = o, e = [], t = _t(); null !== t;) {
              e.push(t), t = _t();
            }if (null !== e) {
              if (null !== (t = F())) {
                if (null !== (n = $())) {
                  if (null !== (r = U())) {
                    for (i = [], c = o, null !== (s = q()) && null !== (a = Tt()) ? s = [s, a] : (s = null, o = c); null !== s;) {
                      i.push(s), c = o, null !== (s = q()) && null !== (a = Tt()) ? s = [s, a] : (s = null, o = c);
                    }null !== i ? e = [e, t, n, r, i] : (e = null, o = u);
                  } else e = null, o = u;
                } else e = null, o = u;
              } else e = null, o = u;
            } else e = null, o = u;return null !== e && (e = function (e) {
              try {
                Hn = new Fn(Hn.uri, Hn.display_name, Hn.params);
              } catch (e) {
                Hn = -1;
              }
            }()), null === e && (o = l), e;
          }, Proxy_Authenticate: function Proxy_Authenticate() {
            return Ht();
          }, challenge: Ht, other_challenge: qt, auth_param: zt, digest_cln: Gt, realm: Vt, realm_value: Bt, domain: Wt, URI: Yt, nonce: Kt, nonce_value: Jt, opaque: Qt, stale: $t, algorithm: Zt, qop_options: Xt, qop_value: en, Proxy_Require: function Proxy_Require() {
            var e, t, n, r, i, s;if (i = o, null !== (e = x())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, Record_Route: function Record_Route() {
            var e, t, n, r, i, s, a;if (i = o, s = o, null !== (e = tn())) {
              for (t = [], a = o, null !== (n = H()) && null !== (r = tn()) ? n = [n, r] : (n = null, o = a); null !== n;) {
                t.push(n), a = o, null !== (n = H()) && null !== (r = tn()) ? n = [n, r] : (n = null, o = a);
              }null !== t ? e = [e, t] : (e = null, o = s);
            } else e = null, o = s;return null !== e && (e = function (e) {
              var t, n;for (n = Hn.multi_header.length, t = 0; t < n; t++) {
                if (null === Hn.multi_header[t].parsed) {
                  Hn = null;break;
                }
              }Hn = null !== Hn ? Hn.multi_header : -1;
            }()), null === e && (o = i), e;
          }, rec_route: tn, Reason: function Reason() {
            var e, n, r, i, s, a, u;if (s = o, a = o, "sip" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"SIP"')), null === e && (e = x()), null !== e) {
              for (n = [], u = o, null !== (r = q()) && null !== (i = nn()) ? r = [r, i] : (r = null, o = u); null !== r;) {
                n.push(r), u = o, null !== (r = q()) && null !== (i = nn()) ? r = [r, i] : (r = null, o = u);
              }null !== n ? e = [e, n] : (e = null, o = a);
            } else e = null, o = a;return null !== e && (e = function (e, t) {
              if (Hn.protocol = t.toLowerCase(), Hn.params || (Hn.params = {}), Hn.params.text && '"' === Hn.params.text[0]) {
                var n = Hn.params.text;Hn.text = n.substring(1, n.length - 1), delete Hn.params.text;
              }
            }(0, e[0])), null === e && (o = s), e;
          }, reason_param: nn, reason_cause: rn, Require: function Require() {
            var e, t, n, r, i, s;if (i = o, null !== (e = x())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, Route: function Route() {
            var e, t, n, r, i, s;if (i = o, null !== (e = on())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = on()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = on()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, route_param: on, Subscription_State: function Subscription_State() {
            var e, t, n, r, i, s;if (i = o, null !== (e = sn())) {
              for (t = [], s = o, null !== (n = q()) && null !== (r = an()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = q()) && null !== (r = an()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, substate_value: sn, subexp_params: an, event_reason_value: ln, Subject: function Subject() {
            var e;return null !== (e = E()) ? e : "";
          }, Supported: function Supported() {
            var e, t, n, r, i, s;if (i = o, null !== (e = x())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = x()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return null !== e ? e : "";
          }, To: function To() {
            var e, t, n, r, i, s, a;if (i = o, s = o, null === (e = Q()) && (e = gt()), null !== e) {
              for (t = [], a = o, null !== (n = q()) && null !== (r = un()) ? n = [n, r] : (n = null, o = a); null !== n;) {
                t.push(n), a = o, null !== (n = q()) && null !== (r = un()) ? n = [n, r] : (n = null, o = a);
              }null !== t ? e = [e, t] : (e = null, o = s);
            } else e = null, o = s;return null !== e && (e = function (e) {
              var t = Hn.tag;try {
                Hn = new Fn(Hn.uri, Hn.display_name, Hn.params), t && Hn.setParam("tag", t);
              } catch (e) {
                Hn = -1;
              }
            }()), null === e && (o = i), e;
          }, to_param: un, Via: function Via() {
            var e, t, n, r, i, s;if (i = o, null !== (e = cn())) {
              for (t = [], s = o, null !== (n = H()) && null !== (r = cn()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = H()) && null !== (r = cn()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, via_param: cn, via_params: dn, via_ttl: hn, via_maddr: fn, via_received: pn, via_branch: gn, response_port: _n, rport: mn, sent_protocol: vn, protocol_name: yn, transport: bn, sent_by: Cn, via_host: Tn, via_port: wn, ttl: Sn, WWW_Authenticate: function WWW_Authenticate() {
            return Ht();
          }, Session_Expires: function Session_Expires() {
            var e, t, n, r, i, s;if (i = o, null !== (e = An())) {
              for (t = [], s = o, null !== (n = q()) && null !== (r = En()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = q()) && null !== (r = En()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, s_e_expires: An, s_e_params: En, s_e_refresher: In, extension_header: function extension_header() {
            var e, t, n, r;return r = o, null !== (e = x()) && null !== (t = A()) && null !== (n = Rn()) ? e = [e, t, n] : (e = null, o = r), e;
          }, header_value: Rn, message_body: function message_body() {
            var e, t;for (e = [], t = p(); null !== t;) {
              e.push(t), t = p();
            }return e;
          }, uuid_URI: function uuid_URI() {
            var e, n, r;return r = o, "uuid:" === t.substr(o, 5) ? (e = "uuid:", o += 5) : (e = null, l('"uuid:"')), null !== e && null !== (n = kn()) ? e = [e, n] : (e = null, o = r), e;
          }, uuid: kn, hex4: xn, hex8: Mn, hex12: Dn, Refer_To: function Refer_To() {
            var e, t, n, r, i, s, a;if (i = o, s = o, null === (e = Q()) && (e = gt()), null !== e) {
              for (t = [], a = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = a); null !== n;) {
                t.push(n), a = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = a);
              }null !== t ? e = [e, t] : (e = null, o = s);
            } else e = null, o = s;return null !== e && (e = function (e) {
              try {
                Hn = new Fn(Hn.uri, Hn.display_name, Hn.params);
              } catch (e) {
                Hn = -1;
              }
            }()), null === e && (o = i), e;
          }, Replaces: function Replaces() {
            var e, t, n, r, i, s;if (i = o, null !== (e = On())) {
              for (t = [], s = o, null !== (n = q()) && null !== (r = Ln()) ? n = [n, r] : (n = null, o = s); null !== n;) {
                t.push(n), s = o, null !== (n = q()) && null !== (r = Ln()) ? n = [n, r] : (n = null, o = s);
              }null !== t ? e = [e, t] : (e = null, o = i);
            } else e = null, o = i;return e;
          }, call_id: On, replaces_param: Ln, to_tag: Pn, from_tag: Nn, early_flag: jn };if (void 0 !== r) {
          if (void 0 === i[r]) throw new Error("Invalid rule name: " + e(r) + ".");
        } else r = "CRLF";var o = 0,
            s = 0,
            a = [];function l(e) {
          o < s || (o > s && (s = o, a = []), a.push(e));
        }function u() {
          var e;return "\r\n" === t.substr(o, 2) ? (e = "\r\n", o += 2) : (e = null, l('"\\r\\n"')), e;
        }function c() {
          var e;return (/^[0-9]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[0-9]")), e
          );
        }function d() {
          var e;return (/^[a-zA-Z]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[a-zA-Z]")), e
          );
        }function h() {
          var e;return (/^[0-9a-fA-F]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[0-9a-fA-F]")), e
          );
        }function f() {
          var e;return null === (e = _()) && (e = m()), e;
        }function p() {
          var e;return (/^[\0-\xFF]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[\\0-\\xFF]")), e
          );
        }function g() {
          var e;return (/^["]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l('["]')), e
          );
        }function _() {
          var e;return 32 === t.charCodeAt(o) ? (e = " ", o++) : (e = null, l('" "')), e;
        }function m() {
          var e;return 9 === t.charCodeAt(o) ? (e = "\t", o++) : (e = null, l('"\\t"')), e;
        }function v() {
          var e;return (/^[a-zA-Z0-9]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[a-zA-Z0-9]")), e
          );
        }function y() {
          var e;return 59 === t.charCodeAt(o) ? (e = ";", o++) : (e = null, l('";"')), null === e && (47 === t.charCodeAt(o) ? (e = "/", o++) : (e = null, l('"/"')), null === e && (63 === t.charCodeAt(o) ? (e = "?", o++) : (e = null, l('"?"')), null === e && (58 === t.charCodeAt(o) ? (e = ":", o++) : (e = null, l('":"')), null === e && (64 === t.charCodeAt(o) ? (e = "@", o++) : (e = null, l('"@"')), null === e && (38 === t.charCodeAt(o) ? (e = "&", o++) : (e = null, l('"&"')), null === e && (61 === t.charCodeAt(o) ? (e = "=", o++) : (e = null, l('"="')), null === e && (43 === t.charCodeAt(o) ? (e = "+", o++) : (e = null, l('"+"')), null === e && (36 === t.charCodeAt(o) ? (e = "$", o++) : (e = null, l('"$"')), null === e && (44 === t.charCodeAt(o) ? (e = ",", o++) : (e = null, l('","'))))))))))), e;
        }function b() {
          var e;return null === (e = v()) && (e = C()), e;
        }function C() {
          var e;return 45 === t.charCodeAt(o) ? (e = "-", o++) : (e = null, l('"-"')), null === e && (95 === t.charCodeAt(o) ? (e = "_", o++) : (e = null, l('"_"')), null === e && (46 === t.charCodeAt(o) ? (e = ".", o++) : (e = null, l('"."')), null === e && (33 === t.charCodeAt(o) ? (e = "!", o++) : (e = null, l('"!"')), null === e && (126 === t.charCodeAt(o) ? (e = "~", o++) : (e = null, l('"~"')), null === e && (42 === t.charCodeAt(o) ? (e = "*", o++) : (e = null, l('"*"')), null === e && (39 === t.charCodeAt(o) ? (e = "'", o++) : (e = null, l('"\'"')), null === e && (40 === t.charCodeAt(o) ? (e = "(", o++) : (e = null, l('"("')), null === e && (41 === t.charCodeAt(o) ? (e = ")", o++) : (e = null, l('")"')))))))))), e;
        }function T() {
          var e, n, r, i, s;return i = o, s = o, 37 === t.charCodeAt(o) ? (e = "%", o++) : (e = null, l('"%"')), null !== e && null !== (n = h()) && null !== (r = h()) ? e = [e, n, r] : (e = null, o = s), null !== e && (e = e.join("")), null === e && (o = i), e;
        }function w() {
          var e, t, n, r, i, s;for (r = o, i = o, s = o, e = [], t = f(); null !== t;) {
            e.push(t), t = f();
          }if (null !== e && null !== (t = u()) ? e = [e, t] : (e = null, o = s), null !== (e = null !== e ? e : "")) {
            if (null !== (n = f())) for (t = []; null !== n;) {
              t.push(n), n = f();
            } else t = null;null !== t ? e = [e, t] : (e = null, o = i);
          } else e = null, o = i;return null !== e && (e = " "), null === e && (o = r), e;
        }function S() {
          var e;return null !== (e = w()) ? e : "";
        }function A() {
          var e, n, r, i, s;for (i = o, s = o, e = [], null === (n = _()) && (n = m()); null !== n;) {
            e.push(n), null === (n = _()) && (n = m());
          }return null !== e ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = ":"), null === e && (o = i), e;
        }function E() {
          var e, n, r, i, s, a, l;if (s = o, a = o, null !== (n = I())) for (e = []; null !== n;) {
            e.push(n), n = I();
          } else e = null;if (null !== e) {
            for (n = [], l = o, r = [], i = w(); null !== i;) {
              r.push(i), i = w();
            }for (null !== r && null !== (i = I()) ? r = [r, i] : (r = null, o = l); null !== r;) {
              for (n.push(r), l = o, r = [], i = w(); null !== i;) {
                r.push(i), i = w();
              }null !== r && null !== (i = I()) ? r = [r, i] : (r = null, o = l);
            }null !== n ? e = [e, n] : (e = null, o = a);
          } else e = null, o = a;return null !== e && (e = function (e) {
            return t.substring(o, e);
          }(s)), null === e && (o = s), e;
        }function I() {
          var e;return (/^[!-~]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[!-~]")), null === e && (e = R()), e
          );
        }function R() {
          var e;return (/^[\x80-\uFFFF]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[\\x80-\\uFFFF]")), e
          );
        }function k() {
          var e;return (/^[\x80-\xBF]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[\\x80-\\xBF]")), e
          );
        }function x() {
          var e, n, r;if (r = o, null === (n = v()) && (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null === n && (46 === t.charCodeAt(o) ? (n = ".", o++) : (n = null, l('"."')), null === n && (33 === t.charCodeAt(o) ? (n = "!", o++) : (n = null, l('"!"')), null === n && (37 === t.charCodeAt(o) ? (n = "%", o++) : (n = null, l('"%"')), null === n && (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null === n && (95 === t.charCodeAt(o) ? (n = "_", o++) : (n = null, l('"_"')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (96 === t.charCodeAt(o) ? (n = "`", o++) : (n = null, l('"`"')), null === n && (39 === t.charCodeAt(o) ? (n = "'", o++) : (n = null, l('"\'"')), null === n && (126 === t.charCodeAt(o) ? (n = "~", o++) : (n = null, l('"~"')))))))))))), null !== n) for (e = []; null !== n;) {
            e.push(n), null === (n = v()) && (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null === n && (46 === t.charCodeAt(o) ? (n = ".", o++) : (n = null, l('"."')), null === n && (33 === t.charCodeAt(o) ? (n = "!", o++) : (n = null, l('"!"')), null === n && (37 === t.charCodeAt(o) ? (n = "%", o++) : (n = null, l('"%"')), null === n && (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null === n && (95 === t.charCodeAt(o) ? (n = "_", o++) : (n = null, l('"_"')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (96 === t.charCodeAt(o) ? (n = "`", o++) : (n = null, l('"`"')), null === n && (39 === t.charCodeAt(o) ? (n = "'", o++) : (n = null, l('"\'"')), null === n && (126 === t.charCodeAt(o) ? (n = "~", o++) : (n = null, l('"~"'))))))))))));
          } else e = null;return null !== e && (e = function (e) {
            return t.substring(o, e);
          }(r)), null === e && (o = r), e;
        }function M() {
          var e, n, r;if (r = o, null === (n = v()) && (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null === n && (33 === t.charCodeAt(o) ? (n = "!", o++) : (n = null, l('"!"')), null === n && (37 === t.charCodeAt(o) ? (n = "%", o++) : (n = null, l('"%"')), null === n && (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null === n && (95 === t.charCodeAt(o) ? (n = "_", o++) : (n = null, l('"_"')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (96 === t.charCodeAt(o) ? (n = "`", o++) : (n = null, l('"`"')), null === n && (39 === t.charCodeAt(o) ? (n = "'", o++) : (n = null, l('"\'"')), null === n && (126 === t.charCodeAt(o) ? (n = "~", o++) : (n = null, l('"~"'))))))))))), null !== n) for (e = []; null !== n;) {
            e.push(n), null === (n = v()) && (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null === n && (33 === t.charCodeAt(o) ? (n = "!", o++) : (n = null, l('"!"')), null === n && (37 === t.charCodeAt(o) ? (n = "%", o++) : (n = null, l('"%"')), null === n && (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null === n && (95 === t.charCodeAt(o) ? (n = "_", o++) : (n = null, l('"_"')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (96 === t.charCodeAt(o) ? (n = "`", o++) : (n = null, l('"`"')), null === n && (39 === t.charCodeAt(o) ? (n = "'", o++) : (n = null, l('"\'"')), null === n && (126 === t.charCodeAt(o) ? (n = "~", o++) : (n = null, l('"~"')))))))))));
          } else e = null;return null !== e && (e = function (e) {
            return t.substring(o, e);
          }(r)), null === e && (o = r), e;
        }function D() {
          var e, n, r;if (r = o, null === (n = v()) && (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null === n && (46 === t.charCodeAt(o) ? (n = ".", o++) : (n = null, l('"."')), null === n && (33 === t.charCodeAt(o) ? (n = "!", o++) : (n = null, l('"!"')), null === n && (37 === t.charCodeAt(o) ? (n = "%", o++) : (n = null, l('"%"')), null === n && (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null === n && (95 === t.charCodeAt(o) ? (n = "_", o++) : (n = null, l('"_"')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (96 === t.charCodeAt(o) ? (n = "`", o++) : (n = null, l('"`"')), null === n && (39 === t.charCodeAt(o) ? (n = "'", o++) : (n = null, l('"\'"')), null === n && (126 === t.charCodeAt(o) ? (n = "~", o++) : (n = null, l('"~"')), null === n && (40 === t.charCodeAt(o) ? (n = "(", o++) : (n = null, l('"("')), null === n && (41 === t.charCodeAt(o) ? (n = ")", o++) : (n = null, l('")"')), null === n && (60 === t.charCodeAt(o) ? (n = "<", o++) : (n = null, l('"<"')), null === n && (62 === t.charCodeAt(o) ? (n = ">", o++) : (n = null, l('">"')), null === n && (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null === n && (92 === t.charCodeAt(o) ? (n = "\\", o++) : (n = null, l('"\\\\"')), null === n && null === (n = g()) && (47 === t.charCodeAt(o) ? (n = "/", o++) : (n = null, l('"/"')), null === n && (91 === t.charCodeAt(o) ? (n = "[", o++) : (n = null, l('"["')), null === n && (93 === t.charCodeAt(o) ? (n = "]", o++) : (n = null, l('"]"')), null === n && (63 === t.charCodeAt(o) ? (n = "?", o++) : (n = null, l('"?"')), null === n && (123 === t.charCodeAt(o) ? (n = "{", o++) : (n = null, l('"{"')), null === n && (125 === t.charCodeAt(o) ? (n = "}", o++) : (n = null, l('"}"')))))))))))))))))))))))), null !== n) for (e = []; null !== n;) {
            e.push(n), null === (n = v()) && (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null === n && (46 === t.charCodeAt(o) ? (n = ".", o++) : (n = null, l('"."')), null === n && (33 === t.charCodeAt(o) ? (n = "!", o++) : (n = null, l('"!"')), null === n && (37 === t.charCodeAt(o) ? (n = "%", o++) : (n = null, l('"%"')), null === n && (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null === n && (95 === t.charCodeAt(o) ? (n = "_", o++) : (n = null, l('"_"')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (96 === t.charCodeAt(o) ? (n = "`", o++) : (n = null, l('"`"')), null === n && (39 === t.charCodeAt(o) ? (n = "'", o++) : (n = null, l('"\'"')), null === n && (126 === t.charCodeAt(o) ? (n = "~", o++) : (n = null, l('"~"')), null === n && (40 === t.charCodeAt(o) ? (n = "(", o++) : (n = null, l('"("')), null === n && (41 === t.charCodeAt(o) ? (n = ")", o++) : (n = null, l('")"')), null === n && (60 === t.charCodeAt(o) ? (n = "<", o++) : (n = null, l('"<"')), null === n && (62 === t.charCodeAt(o) ? (n = ">", o++) : (n = null, l('">"')), null === n && (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null === n && (92 === t.charCodeAt(o) ? (n = "\\", o++) : (n = null, l('"\\\\"')), null === n && null === (n = g()) && (47 === t.charCodeAt(o) ? (n = "/", o++) : (n = null, l('"/"')), null === n && (91 === t.charCodeAt(o) ? (n = "[", o++) : (n = null, l('"["')), null === n && (93 === t.charCodeAt(o) ? (n = "]", o++) : (n = null, l('"]"')), null === n && (63 === t.charCodeAt(o) ? (n = "?", o++) : (n = null, l('"?"')), null === n && (123 === t.charCodeAt(o) ? (n = "{", o++) : (n = null, l('"{"')), null === n && (125 === t.charCodeAt(o) ? (n = "}", o++) : (n = null, l('"}"'))))))))))))))))))))))));
          } else e = null;return null !== e && (e = function (e) {
            return t.substring(o, e);
          }(r)), null === e && (o = r), e;
        }function O() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (42 === t.charCodeAt(o) ? (n = "*", o++) : (n = null, l('"*"')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = "*"), null === e && (o = i), e;
        }function L() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (47 === t.charCodeAt(o) ? (n = "/", o++) : (n = null, l('"/"')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = "/"), null === e && (o = i), e;
        }function P() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = "="), null === e && (o = i), e;
        }function N() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (40 === t.charCodeAt(o) ? (n = "(", o++) : (n = null, l('"("')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = "("), null === e && (o = i), e;
        }function j() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (41 === t.charCodeAt(o) ? (n = ")", o++) : (n = null, l('")"')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = ")"), null === e && (o = i), e;
        }function U() {
          var e, n, r, i;return r = o, i = o, 62 === t.charCodeAt(o) ? (e = ">", o++) : (e = null, l('">"')), null !== e && null !== (n = S()) ? e = [e, n] : (e = null, o = i), null !== e && (e = ">"), null === e && (o = r), e;
        }function F() {
          var e, n, r, i;return r = o, i = o, null !== (e = S()) ? (60 === t.charCodeAt(o) ? (n = "<", o++) : (n = null, l('"<"')), null !== n ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), null !== e && (e = "<"), null === e && (o = r), e;
        }function H() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (44 === t.charCodeAt(o) ? (n = ",", o++) : (n = null, l('","')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = ","), null === e && (o = i), e;
        }function q() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (59 === t.charCodeAt(o) ? (n = ";", o++) : (n = null, l('";"')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = ";"), null === e && (o = i), e;
        }function z() {
          var e, n, r, i, s;return i = o, s = o, null !== (e = S()) ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = S()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = ":"), null === e && (o = i), e;
        }function G() {
          var e, t, n, r;return n = o, r = o, null !== (e = S()) && null !== (t = g()) ? e = [e, t] : (e = null, o = r), null !== e && (e = '"'), null === e && (o = n), e;
        }function V() {
          var e, t, n, r;return n = o, r = o, null !== (e = g()) && null !== (t = S()) ? e = [e, t] : (e = null, o = r), null !== e && (e = '"'), null === e && (o = n), e;
        }function B() {
          var e;return (/^[!-']/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[!-']")), null === e && (/^[*-[]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[*-[]")), null === e && (/^[\]-~]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[\\]-~]")), null === e && null === (e = R()) && (e = w()))), e
          );
        }function W() {
          var e, n, r, i, s, a;if (s = o, a = o, null !== (e = S())) {
            if (null !== (n = g())) {
              for (r = [], null === (i = K()) && (i = J()); null !== i;) {
                r.push(i), null === (i = K()) && (i = J());
              }null !== r && null !== (i = g()) ? e = [e, n, r, i] : (e = null, o = a);
            } else e = null, o = a;
          } else e = null, o = a;return null !== e && (e = function (e) {
            return t.substring(o, e);
          }(s)), null === e && (o = s), e;
        }function Y() {
          var e, n, r, i, s, a;if (s = o, a = o, null !== (e = S())) {
            if (null !== (n = g())) {
              for (r = [], null === (i = K()) && (i = J()); null !== i;) {
                r.push(i), null === (i = K()) && (i = J());
              }null !== r && null !== (i = g()) ? e = [e, n, r, i] : (e = null, o = a);
            } else e = null, o = a;
          } else e = null, o = a;return null !== e && (e = function (e) {
            var n = t.substring(o, e).trim();return n.substring(1, n.length - 1).replace(/\\([\x00-\x09\x0b-\x0c\x0e-\x7f])/g, "$1");
          }(s)), null === e && (o = s), e;
        }function K() {
          var e;return null === (e = w()) && (33 === t.charCodeAt(o) ? (e = "!", o++) : (e = null, l('"!"')), null === e && (/^[#-[]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[#-[]")), null === e && (/^[\]-~]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[\\]-~]")), null === e && (e = R())))), e;
        }function J() {
          var e, n, r;return r = o, 92 === t.charCodeAt(o) ? (e = "\\", o++) : (e = null, l('"\\\\"')), null !== e ? (/^[\0-\t]/.test(t.charAt(o)) ? (n = t.charAt(o), o++) : (n = null, l("[\\0-\\t]")), null === n && (/^[\x0B-\f]/.test(t.charAt(o)) ? (n = t.charAt(o), o++) : (n = null, l("[\\x0B-\\f]")), null === n && (/^[\x0E-]/.test(t.charAt(o)) ? (n = t.charAt(o), o++) : (n = null, l("[\\x0E-]")))), null !== n ? e = [e, n] : (e = null, o = r)) : (e = null, o = r), e;
        }function Q() {
          var e, n, r, i, s, a;return s = o, a = o, null !== (e = Z()) ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = null !== (r = te()) ? r : "") && null !== (i = oe()) ? e = [e, n, r, i] : (e = null, o = a)) : (e = null, o = a), null !== e && (e = function (e) {
            try {
              Hn.uri = new Un(Hn.scheme, Hn.user, Hn.host, Hn.port), delete Hn.scheme, delete Hn.user, delete Hn.host, delete Hn.host_type, delete Hn.port;
            } catch (e) {
              Hn = -1;
            }
          }()), null === e && (o = s), e;
        }function $() {
          var e, n, i, s, a, u, c, d;return c = o, d = o, null !== (e = Z()) ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (i = null !== (i = te()) ? i : "") && null !== (s = oe()) && null !== (a = me()) && null !== (u = null !== (u = xe()) ? u : "") ? e = [e, n, i, s, a, u] : (e = null, o = d)) : (e = null, o = d), null !== e && (e = function (e) {
            try {
              Hn.uri = new Un(Hn.scheme, Hn.user, Hn.host, Hn.port, Hn.uri_params, Hn.uri_headers), delete Hn.scheme, delete Hn.user, delete Hn.host, delete Hn.host_type, delete Hn.port, delete Hn.uri_params, "SIP_URI" === r && (Hn = Hn.uri);
            } catch (e) {
              Hn = -1;
            }
          }()), null === e && (o = c), e;
        }function Z() {
          var e;return null === (e = X()) && (e = ee()), e;
        }function X() {
          var e, n, r;return n = o, "sips" === t.substr(o, 4).toLowerCase() ? (e = t.substr(o, 4), o += 4) : (e = null, l('"sips"')), null !== e && (r = e, e = void (Hn.scheme = r.toLowerCase())), null === e && (o = n), e;
        }function ee() {
          var e, n, r;return n = o, "sip" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"sip"')), null !== e && (r = e, e = void (Hn.scheme = r.toLowerCase())), null === e && (o = n), e;
        }function te() {
          var e, n, r, i, s, a;return i = o, s = o, null !== (e = ne()) ? (a = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = ie()) ? n = [n, r] : (n = null, o = a), null !== (n = null !== n ? n : "") ? (64 === t.charCodeAt(o) ? (r = "@", o++) : (r = null, l('"@"')), null !== r ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s)) : (e = null, o = s), null !== e && (e = function (e) {
            Hn.user = decodeURIComponent(t.substring(o - 1, e));
          }(i)), null === e && (o = i), e;
        }function ne() {
          var e, t;if (null === (t = b()) && null === (t = T()) && (t = re()), null !== t) for (e = []; null !== t;) {
            e.push(t), null === (t = b()) && null === (t = T()) && (t = re());
          } else e = null;return e;
        }function re() {
          var e;return 38 === t.charCodeAt(o) ? (e = "&", o++) : (e = null, l('"&"')), null === e && (61 === t.charCodeAt(o) ? (e = "=", o++) : (e = null, l('"="')), null === e && (43 === t.charCodeAt(o) ? (e = "+", o++) : (e = null, l('"+"')), null === e && (36 === t.charCodeAt(o) ? (e = "$", o++) : (e = null, l('"$"')), null === e && (44 === t.charCodeAt(o) ? (e = ",", o++) : (e = null, l('","')), null === e && (59 === t.charCodeAt(o) ? (e = ";", o++) : (e = null, l('";"')), null === e && (63 === t.charCodeAt(o) ? (e = "?", o++) : (e = null, l('"?"')), null === e && (47 === t.charCodeAt(o) ? (e = "/", o++) : (e = null, l('"/"'))))))))), e;
        }function ie() {
          var e, n, r;for (r = o, e = [], null === (n = b()) && null === (n = T()) && (38 === t.charCodeAt(o) ? (n = "&", o++) : (n = null, l('"&"')), null === n && (61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (36 === t.charCodeAt(o) ? (n = "$", o++) : (n = null, l('"$"')), null === n && (44 === t.charCodeAt(o) ? (n = ",", o++) : (n = null, l('","'))))))); null !== n;) {
            e.push(n), null === (n = b()) && null === (n = T()) && (38 === t.charCodeAt(o) ? (n = "&", o++) : (n = null, l('"&"')), null === n && (61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')), null === n && (36 === t.charCodeAt(o) ? (n = "$", o++) : (n = null, l('"$"')), null === n && (44 === t.charCodeAt(o) ? (n = ",", o++) : (n = null, l('","')))))));
          }return null !== e && (e = function (e) {
            Hn.password = t.substring(o, e);
          }(r)), null === e && (o = r), e;
        }function oe() {
          var e, n, r, i, s;return i = o, null !== (e = se()) ? (s = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = _e()) ? n = [n, r] : (n = null, o = s), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), e;
        }function se() {
          var e, n;return n = o, null === (e = ae()) && null === (e = pe()) && (e = ce()), null !== e && (e = function (e) {
            return Hn.host = t.substring(o, e).toLowerCase(), Hn.host;
          }(n)), null === e && (o = n), e;
        }function ae() {
          var e, n, r, i, s, a;for (i = o, s = o, e = [], a = o, null !== (n = le()) ? (46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."')), null !== r ? n = [n, r] : (n = null, o = a)) : (n = null, o = a); null !== n;) {
            e.push(n), a = o, null !== (n = le()) ? (46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."')), null !== r ? n = [n, r] : (n = null, o = a)) : (n = null, o = a);
          }return null !== e && null !== (n = ue()) ? (46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."')), null !== (r = null !== r ? r : "") ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = function (e) {
            return Hn.host_type = "domain", t.substring(o, e);
          }(i)), null === e && (o = i), e;
        }function le() {
          var e, n, r, i;if (i = o, null !== (e = v())) {
            for (n = [], null === (r = v()) && (45 === t.charCodeAt(o) ? (r = "-", o++) : (r = null, l('"-"')), null === r && (95 === t.charCodeAt(o) ? (r = "_", o++) : (r = null, l('"_"')))); null !== r;) {
              n.push(r), null === (r = v()) && (45 === t.charCodeAt(o) ? (r = "-", o++) : (r = null, l('"-"')), null === r && (95 === t.charCodeAt(o) ? (r = "_", o++) : (r = null, l('"_"'))));
            }null !== n ? e = [e, n] : (e = null, o = i);
          } else e = null, o = i;return e;
        }function ue() {
          var e, n, r, i;if (i = o, null !== (e = d())) {
            for (n = [], null === (r = v()) && (45 === t.charCodeAt(o) ? (r = "-", o++) : (r = null, l('"-"')), null === r && (95 === t.charCodeAt(o) ? (r = "_", o++) : (r = null, l('"_"')))); null !== r;) {
              n.push(r), null === (r = v()) && (45 === t.charCodeAt(o) ? (r = "-", o++) : (r = null, l('"-"')), null === r && (95 === t.charCodeAt(o) ? (r = "_", o++) : (r = null, l('"_"'))));
            }null !== n ? e = [e, n] : (e = null, o = i);
          } else e = null, o = i;return e;
        }function ce() {
          var e, n, r, i, s;return i = o, s = o, 91 === t.charCodeAt(o) ? (e = "[", o++) : (e = null, l('"["')), null !== e && null !== (n = de()) ? (93 === t.charCodeAt(o) ? (r = "]", o++) : (r = null, l('"]"')), null !== r ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = function (e) {
            return Hn.host_type = "IPv6", t.substring(o, e);
          }(i)), null === e && (o = i), e;
        }function de() {
          var e, n, r, i, s, a, u, c, d, h, f, p, g, _, m, v;return _ = o, m = o, null !== (e = he()) ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? (58 === t.charCodeAt(o) ? (i = ":", o++) : (i = null, l('":"')), null !== i && null !== (s = he()) ? (58 === t.charCodeAt(o) ? (a = ":", o++) : (a = null, l('":"')), null !== a && null !== (u = he()) ? (58 === t.charCodeAt(o) ? (c = ":", o++) : (c = null, l('":"')), null !== c && null !== (d = he()) ? (58 === t.charCodeAt(o) ? (h = ":", o++) : (h = null, l('":"')), null !== h && null !== (f = he()) ? (58 === t.charCodeAt(o) ? (p = ":", o++) : (p = null, l('":"')), null !== p && null !== (g = fe()) ? e = [e, n, r, i, s, a, u, c, d, h, f, p, g] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = he()) ? (58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? (58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? (58 === t.charCodeAt(o) ? (u = ":", o++) : (u = null, l('":"')), null !== u && null !== (c = he()) ? (58 === t.charCodeAt(o) ? (d = ":", o++) : (d = null, l('":"')), null !== d && null !== (h = he()) ? (58 === t.charCodeAt(o) ? (f = ":", o++) : (f = null, l('":"')), null !== f && null !== (p = fe()) ? e = [e, n, r, i, s, a, u, c, d, h, f, p] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = he()) ? (58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? (58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? (58 === t.charCodeAt(o) ? (u = ":", o++) : (u = null, l('":"')), null !== u && null !== (c = he()) ? (58 === t.charCodeAt(o) ? (d = ":", o++) : (d = null, l('":"')), null !== d && null !== (h = fe()) ? e = [e, n, r, i, s, a, u, c, d, h] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = he()) ? (58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? (58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? (58 === t.charCodeAt(o) ? (u = ":", o++) : (u = null, l('":"')), null !== u && null !== (c = fe()) ? e = [e, n, r, i, s, a, u, c] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = he()) ? (58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? (58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = fe()) ? e = [e, n, r, i, s, a] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = he()) ? (58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = fe()) ? e = [e, n, r, i] : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = fe()) ? e = [e, n] : (e = null, o = m), null === e && (m = o, "::" === t.substr(o, 2) ? (e = "::", o += 2) : (e = null, l('"::"')), null !== e && null !== (n = he()) ? e = [e, n] : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? ("::" === t.substr(o, 2) ? (n = "::", o += 2) : (n = null, l('"::"')), null !== n && null !== (r = he()) ? (58 === t.charCodeAt(o) ? (i = ":", o++) : (i = null, l('":"')), null !== i && null !== (s = he()) ? (58 === t.charCodeAt(o) ? (a = ":", o++) : (a = null, l('":"')), null !== a && null !== (u = he()) ? (58 === t.charCodeAt(o) ? (c = ":", o++) : (c = null, l('":"')), null !== c && null !== (d = he()) ? (58 === t.charCodeAt(o) ? (h = ":", o++) : (h = null, l('":"')), null !== h && null !== (f = fe()) ? e = [e, n, r, i, s, a, u, c, d, h, f] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? (v = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? n = [n, r] : (n = null, o = v), null !== (n = null !== n ? n : "") ? ("::" === t.substr(o, 2) ? (r = "::", o += 2) : (r = null, l('"::"')), null !== r && null !== (i = he()) ? (58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? (58 === t.charCodeAt(o) ? (u = ":", o++) : (u = null, l('":"')), null !== u && null !== (c = he()) ? (58 === t.charCodeAt(o) ? (d = ":", o++) : (d = null, l('":"')), null !== d && null !== (h = fe()) ? e = [e, n, r, i, s, a, u, c, d, h] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? (v = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? n = [n, r] : (n = null, o = v), null !== (n = null !== n ? n : "") ? (v = o, 58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? r = [r, i] : (r = null, o = v), null !== (r = null !== r ? r : "") ? ("::" === t.substr(o, 2) ? (i = "::", o += 2) : (i = null, l('"::"')), null !== i && null !== (s = he()) ? (58 === t.charCodeAt(o) ? (a = ":", o++) : (a = null, l('":"')), null !== a && null !== (u = he()) ? (58 === t.charCodeAt(o) ? (c = ":", o++) : (c = null, l('":"')), null !== c && null !== (d = fe()) ? e = [e, n, r, i, s, a, u, c, d] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? (v = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? n = [n, r] : (n = null, o = v), null !== (n = null !== n ? n : "") ? (v = o, 58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? r = [r, i] : (r = null, o = v), null !== (r = null !== r ? r : "") ? (v = o, 58 === t.charCodeAt(o) ? (i = ":", o++) : (i = null, l('":"')), null !== i && null !== (s = he()) ? i = [i, s] : (i = null, o = v), null !== (i = null !== i ? i : "") ? ("::" === t.substr(o, 2) ? (s = "::", o += 2) : (s = null, l('"::"')), null !== s && null !== (a = he()) ? (58 === t.charCodeAt(o) ? (u = ":", o++) : (u = null, l('":"')), null !== u && null !== (c = fe()) ? e = [e, n, r, i, s, a, u, c] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? (v = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? n = [n, r] : (n = null, o = v), null !== (n = null !== n ? n : "") ? (v = o, 58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? r = [r, i] : (r = null, o = v), null !== (r = null !== r ? r : "") ? (v = o, 58 === t.charCodeAt(o) ? (i = ":", o++) : (i = null, l('":"')), null !== i && null !== (s = he()) ? i = [i, s] : (i = null, o = v), null !== (i = null !== i ? i : "") ? (v = o, 58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? s = [s, a] : (s = null, o = v), null !== (s = null !== s ? s : "") ? ("::" === t.substr(o, 2) ? (a = "::", o += 2) : (a = null, l('"::"')), null !== a && null !== (u = fe()) ? e = [e, n, r, i, s, a, u] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? (v = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? n = [n, r] : (n = null, o = v), null !== (n = null !== n ? n : "") ? (v = o, 58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? r = [r, i] : (r = null, o = v), null !== (r = null !== r ? r : "") ? (v = o, 58 === t.charCodeAt(o) ? (i = ":", o++) : (i = null, l('":"')), null !== i && null !== (s = he()) ? i = [i, s] : (i = null, o = v), null !== (i = null !== i ? i : "") ? (v = o, 58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? s = [s, a] : (s = null, o = v), null !== (s = null !== s ? s : "") ? (v = o, 58 === t.charCodeAt(o) ? (a = ":", o++) : (a = null, l('":"')), null !== a && null !== (u = he()) ? a = [a, u] : (a = null, o = v), null !== (a = null !== a ? a : "") ? ("::" === t.substr(o, 2) ? (u = "::", o += 2) : (u = null, l('"::"')), null !== u && null !== (c = he()) ? e = [e, n, r, i, s, a, u, c] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m), null === e && (m = o, null !== (e = he()) ? (v = o, 58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? n = [n, r] : (n = null, o = v), null !== (n = null !== n ? n : "") ? (v = o, 58 === t.charCodeAt(o) ? (r = ":", o++) : (r = null, l('":"')), null !== r && null !== (i = he()) ? r = [r, i] : (r = null, o = v), null !== (r = null !== r ? r : "") ? (v = o, 58 === t.charCodeAt(o) ? (i = ":", o++) : (i = null, l('":"')), null !== i && null !== (s = he()) ? i = [i, s] : (i = null, o = v), null !== (i = null !== i ? i : "") ? (v = o, 58 === t.charCodeAt(o) ? (s = ":", o++) : (s = null, l('":"')), null !== s && null !== (a = he()) ? s = [s, a] : (s = null, o = v), null !== (s = null !== s ? s : "") ? (v = o, 58 === t.charCodeAt(o) ? (a = ":", o++) : (a = null, l('":"')), null !== a && null !== (u = he()) ? a = [a, u] : (a = null, o = v), null !== (a = null !== a ? a : "") ? (v = o, 58 === t.charCodeAt(o) ? (u = ":", o++) : (u = null, l('":"')), null !== u && null !== (c = he()) ? u = [u, c] : (u = null, o = v), null !== (u = null !== u ? u : "") ? ("::" === t.substr(o, 2) ? (c = "::", o += 2) : (c = null, l('"::"')), null !== c ? e = [e, n, r, i, s, a, u, c] : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m)) : (e = null, o = m))))))))))))))), null !== e && (e = function (e) {
            return Hn.host_type = "IPv6", t.substring(o, e);
          }(_)), null === e && (o = _), e;
        }function he() {
          var e, t, n, r, i;return i = o, null !== (e = h()) && null !== (t = null !== (t = h()) ? t : "") && null !== (n = null !== (n = h()) ? n : "") && null !== (r = null !== (r = h()) ? r : "") ? e = [e, t, n, r] : (e = null, o = i), e;
        }function fe() {
          var e, n, r, i;return i = o, null !== (e = he()) ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n && null !== (r = he()) ? e = [e, n, r] : (e = null, o = i)) : (e = null, o = i), null === e && (e = pe()), e;
        }function pe() {
          var e, n, r, i, s, a, u, c, d;return c = o, d = o, null !== (e = ge()) ? (46 === t.charCodeAt(o) ? (n = ".", o++) : (n = null, l('"."')), null !== n && null !== (r = ge()) ? (46 === t.charCodeAt(o) ? (i = ".", o++) : (i = null, l('"."')), null !== i && null !== (s = ge()) ? (46 === t.charCodeAt(o) ? (a = ".", o++) : (a = null, l('"."')), null !== a && null !== (u = ge()) ? e = [e, n, r, i, s, a, u] : (e = null, o = d)) : (e = null, o = d)) : (e = null, o = d)) : (e = null, o = d), null !== e && (e = function (e) {
            return Hn.host_type = "IPv4", t.substring(o, e);
          }(c)), null === e && (o = c), e;
        }function ge() {
          var e, n, r, i;return i = o, "25" === t.substr(o, 2) ? (e = "25", o += 2) : (e = null, l('"25"')), null !== e ? (/^[0-5]/.test(t.charAt(o)) ? (n = t.charAt(o), o++) : (n = null, l("[0-5]")), null !== n ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), null === e && (i = o, 50 === t.charCodeAt(o) ? (e = "2", o++) : (e = null, l('"2"')), null !== e ? (/^[0-4]/.test(t.charAt(o)) ? (n = t.charAt(o), o++) : (n = null, l("[0-4]")), null !== n && null !== (r = c()) ? e = [e, n, r] : (e = null, o = i)) : (e = null, o = i), null === e && (i = o, 49 === t.charCodeAt(o) ? (e = "1", o++) : (e = null, l('"1"')), null !== e && null !== (n = c()) && null !== (r = c()) ? e = [e, n, r] : (e = null, o = i), null === e && (i = o, /^[1-9]/.test(t.charAt(o)) ? (e = t.charAt(o), o++) : (e = null, l("[1-9]")), null !== e && null !== (n = c()) ? e = [e, n] : (e = null, o = i), null === e && (e = c())))), e;
        }function _e() {
          var e, t, n, r, i, s, a, l;return s = o, a = o, null !== (e = null !== (e = c()) ? e : "") && null !== (t = null !== (t = c()) ? t : "") && null !== (n = null !== (n = c()) ? n : "") && null !== (r = null !== (r = c()) ? r : "") && null !== (i = null !== (i = c()) ? i : "") ? e = [e, t, n, r, i] : (e = null, o = a), null !== e && (l = e, l = parseInt(l.join("")), Hn.port = l, e = l), null === e && (o = s), e;
        }function me() {
          var e, n, r, i;for (e = [], i = o, 59 === t.charCodeAt(o) ? (n = ";", o++) : (n = null, l('";"')), null !== n && null !== (r = ve()) ? n = [n, r] : (n = null, o = i); null !== n;) {
            e.push(n), i = o, 59 === t.charCodeAt(o) ? (n = ";", o++) : (n = null, l('";"')), null !== n && null !== (r = ve()) ? n = [n, r] : (n = null, o = i);
          }return e;
        }function ve() {
          var e;return null === (e = ye()) && null === (e = be()) && null === (e = Ce()) && null === (e = Te()) && null === (e = we()) && null === (e = Se()) && (e = Ae()), e;
        }function ye() {
          var e, n, r, i, s;return r = o, i = o, "transport=" === t.substr(o, 10).toLowerCase() ? (e = t.substr(o, 10), o += 10) : (e = null, l('"transport="')), null !== e ? ("udp" === t.substr(o, 3).toLowerCase() ? (n = t.substr(o, 3), o += 3) : (n = null, l('"udp"')), null === n && ("tcp" === t.substr(o, 3).toLowerCase() ? (n = t.substr(o, 3), o += 3) : (n = null, l('"tcp"')), null === n && ("sctp" === t.substr(o, 4).toLowerCase() ? (n = t.substr(o, 4), o += 4) : (n = null, l('"sctp"')), null === n && ("tls" === t.substr(o, 3).toLowerCase() ? (n = t.substr(o, 3), o += 3) : (n = null, l('"tls"')), null === n && (n = x())))), null !== n ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), null !== e && (s = e[1], Hn.uri_params || (Hn.uri_params = {}), e = void (Hn.uri_params.transport = s.toLowerCase())), null === e && (o = r), e;
        }function be() {
          var e, n, r, i, s;return r = o, i = o, "user=" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"user="')), null !== e ? ("phone" === t.substr(o, 5).toLowerCase() ? (n = t.substr(o, 5), o += 5) : (n = null, l('"phone"')), null === n && ("ip" === t.substr(o, 2).toLowerCase() ? (n = t.substr(o, 2), o += 2) : (n = null, l('"ip"')), null === n && (n = x())), null !== n ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), null !== e && (s = e[1], Hn.uri_params || (Hn.uri_params = {}), e = void (Hn.uri_params.user = s.toLowerCase())), null === e && (o = r), e;
        }function Ce() {
          var e, n, r, i, s;return r = o, i = o, "method=" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"method="')), null !== e && null !== (n = ut()) ? e = [e, n] : (e = null, o = i), null !== e && (s = e[1], Hn.uri_params || (Hn.uri_params = {}), e = void (Hn.uri_params.method = s)), null === e && (o = r), e;
        }function Te() {
          var e, n, r, i, s;return r = o, i = o, "ttl=" === t.substr(o, 4).toLowerCase() ? (e = t.substr(o, 4), o += 4) : (e = null, l('"ttl="')), null !== e && null !== (n = Sn()) ? e = [e, n] : (e = null, o = i), null !== e && (s = e[1], Hn.params || (Hn.params = {}), e = void (Hn.params.ttl = s)), null === e && (o = r), e;
        }function we() {
          var e, n, r, i, s;return r = o, i = o, "maddr=" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"maddr="')), null !== e && null !== (n = se()) ? e = [e, n] : (e = null, o = i), null !== e && (s = e[1], Hn.uri_params || (Hn.uri_params = {}), e = void (Hn.uri_params.maddr = s)), null === e && (o = r), e;
        }function Se() {
          var e, n, r, i, s, a;return i = o, s = o, "lr" === t.substr(o, 2).toLowerCase() ? (e = t.substr(o, 2), o += 2) : (e = null, l('"lr"')), null !== e ? (a = o, 61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null !== n && null !== (r = x()) ? n = [n, r] : (n = null, o = a), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = s)) : (e = null, o = s), null !== e && (Hn.uri_params || (Hn.uri_params = {}), e = void (Hn.uri_params.lr = void 0)), null === e && (o = i), e;
        }function Ae() {
          var e, n, r, i, s, a, u, c;return i = o, s = o, null !== (e = Ee()) ? (a = o, 61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null !== n && null !== (r = Ie()) ? n = [n, r] : (n = null, o = a), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = s)) : (e = null, o = s), null !== e && (u = e[0], c = e[1], Hn.uri_params || (Hn.uri_params = {}), c = void 0 === c ? void 0 : c[1], e = void (Hn.uri_params[u.toLowerCase()] = c)), null === e && (o = i), e;
        }function Ee() {
          var e, t, n;if (n = o, null !== (t = Re())) for (e = []; null !== t;) {
            e.push(t), t = Re();
          } else e = null;return null !== e && (e = e.join("")), null === e && (o = n), e;
        }function Ie() {
          var e, t, n;if (n = o, null !== (t = Re())) for (e = []; null !== t;) {
            e.push(t), t = Re();
          } else e = null;return null !== e && (e = e.join("")), null === e && (o = n), e;
        }function Re() {
          var e;return null === (e = ke()) && null === (e = b()) && (e = T()), e;
        }function ke() {
          var e;return 91 === t.charCodeAt(o) ? (e = "[", o++) : (e = null, l('"["')), null === e && (93 === t.charCodeAt(o) ? (e = "]", o++) : (e = null, l('"]"')), null === e && (47 === t.charCodeAt(o) ? (e = "/", o++) : (e = null, l('"/"')), null === e && (58 === t.charCodeAt(o) ? (e = ":", o++) : (e = null, l('":"')), null === e && (38 === t.charCodeAt(o) ? (e = "&", o++) : (e = null, l('"&"')), null === e && (43 === t.charCodeAt(o) ? (e = "+", o++) : (e = null, l('"+"')), null === e && (36 === t.charCodeAt(o) ? (e = "$", o++) : (e = null, l('"$"')))))))), e;
        }function xe() {
          var e, n, r, i, s, a, u;if (a = o, 63 === t.charCodeAt(o) ? (e = "?", o++) : (e = null, l('"?"')), null !== e) {
            if (null !== (n = Me())) {
              for (r = [], u = o, 38 === t.charCodeAt(o) ? (i = "&", o++) : (i = null, l('"&"')), null !== i && null !== (s = Me()) ? i = [i, s] : (i = null, o = u); null !== i;) {
                r.push(i), u = o, 38 === t.charCodeAt(o) ? (i = "&", o++) : (i = null, l('"&"')), null !== i && null !== (s = Me()) ? i = [i, s] : (i = null, o = u);
              }null !== r ? e = [e, n, r] : (e = null, o = a);
            } else e = null, o = a;
          } else e = null, o = a;return e;
        }function Me() {
          var e, n, r, i, s, a, u;return i = o, s = o, null !== (e = De()) ? (61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null !== n && null !== (r = Oe()) ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (a = e[0], u = e[2], a = a.join("").toLowerCase(), u = u.join(""), Hn.uri_headers || (Hn.uri_headers = {}), e = void (Hn.uri_headers[a] ? Hn.uri_headers[a].push(u) : Hn.uri_headers[a] = [u])), null === e && (o = i), e;
        }function De() {
          var e, t;if (null === (t = Le()) && null === (t = b()) && (t = T()), null !== t) for (e = []; null !== t;) {
            e.push(t), null === (t = Le()) && null === (t = b()) && (t = T());
          } else e = null;return e;
        }function Oe() {
          var e, t;for (e = [], null === (t = Le()) && null === (t = b()) && (t = T()); null !== t;) {
            e.push(t), null === (t = Le()) && null === (t = b()) && (t = T());
          }return e;
        }function Le() {
          var e;return 91 === t.charCodeAt(o) ? (e = "[", o++) : (e = null, l('"["')), null === e && (93 === t.charCodeAt(o) ? (e = "]", o++) : (e = null, l('"]"')), null === e && (47 === t.charCodeAt(o) ? (e = "/", o++) : (e = null, l('"/"')), null === e && (63 === t.charCodeAt(o) ? (e = "?", o++) : (e = null, l('"?"')), null === e && (58 === t.charCodeAt(o) ? (e = ":", o++) : (e = null, l('":"')), null === e && (43 === t.charCodeAt(o) ? (e = "+", o++) : (e = null, l('"+"')), null === e && (36 === t.charCodeAt(o) ? (e = "$", o++) : (e = null, l('"$"')))))))), e;
        }function Pe() {
          var e, t, n, r, i, s;return s = o, null !== (e = ut()) && null !== (t = _()) && null !== (n = Ne()) && null !== (r = _()) && null !== (i = Xe()) ? e = [e, t, n, r, i] : (e = null, o = s), e;
        }function Ne() {
          var e;return null === (e = $()) && (e = je()), e;
        }function je() {
          var e, n, r, i;return i = o, null !== (e = Ke()) ? (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null !== n ? (null === (r = Ue()) && (r = qe()), null !== r ? e = [e, n, r] : (e = null, o = i)) : (e = null, o = i)) : (e = null, o = i), e;
        }function Ue() {
          var e, n, r, i, s;return i = o, null === (e = Fe()) && (e = He()), null !== e ? (s = o, 63 === t.charCodeAt(o) ? (n = "?", o++) : (n = null, l('"?"')), null !== n && null !== (r = Ze()) ? n = [n, r] : (n = null, o = s), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), e;
        }function Fe() {
          var e, n, r, i;return i = o, "//" === t.substr(o, 2) ? (e = "//", o += 2) : (e = null, l('"//"')), null !== e && null !== (n = Je()) && null !== (r = null !== (r = He()) ? r : "") ? e = [e, n, r] : (e = null, o = i), e;
        }function He() {
          var e, n, r;return r = o, 47 === t.charCodeAt(o) ? (e = "/", o++) : (e = null, l('"/"')), null !== e && null !== (n = Ve()) ? e = [e, n] : (e = null, o = r), e;
        }function qe() {
          var e, t, n, r;if (r = o, null !== (e = Ge())) {
            for (t = [], n = ze(); null !== n;) {
              t.push(n), n = ze();
            }null !== t ? e = [e, t] : (e = null, o = r);
          } else e = null, o = r;return e;
        }function ze() {
          var e;return null === (e = y()) && null === (e = b()) && (e = T()), e;
        }function Ge() {
          var e;return null === (e = b()) && null === (e = T()) && (59 === t.charCodeAt(o) ? (e = ";", o++) : (e = null, l('";"')), null === e && (63 === t.charCodeAt(o) ? (e = "?", o++) : (e = null, l('"?"')), null === e && (58 === t.charCodeAt(o) ? (e = ":", o++) : (e = null, l('":"')), null === e && (64 === t.charCodeAt(o) ? (e = "@", o++) : (e = null, l('"@"')), null === e && (38 === t.charCodeAt(o) ? (e = "&", o++) : (e = null, l('"&"')), null === e && (61 === t.charCodeAt(o) ? (e = "=", o++) : (e = null, l('"="')), null === e && (43 === t.charCodeAt(o) ? (e = "+", o++) : (e = null, l('"+"')), null === e && (36 === t.charCodeAt(o) ? (e = "$", o++) : (e = null, l('"$"')), null === e && (44 === t.charCodeAt(o) ? (e = ",", o++) : (e = null, l('","'))))))))))), e;
        }function Ve() {
          var e, n, r, i, s, a;if (s = o, null !== (e = Be())) {
            for (n = [], a = o, 47 === t.charCodeAt(o) ? (r = "/", o++) : (r = null, l('"/"')), null !== r && null !== (i = Be()) ? r = [r, i] : (r = null, o = a); null !== r;) {
              n.push(r), a = o, 47 === t.charCodeAt(o) ? (r = "/", o++) : (r = null, l('"/"')), null !== r && null !== (i = Be()) ? r = [r, i] : (r = null, o = a);
            }null !== n ? e = [e, n] : (e = null, o = s);
          } else e = null, o = s;return e;
        }function Be() {
          var e, n, r, i, s, a;for (s = o, e = [], n = Ye(); null !== n;) {
            e.push(n), n = Ye();
          }if (null !== e) {
            for (n = [], a = o, 59 === t.charCodeAt(o) ? (r = ";", o++) : (r = null, l('";"')), null !== r && null !== (i = We()) ? r = [r, i] : (r = null, o = a); null !== r;) {
              n.push(r), a = o, 59 === t.charCodeAt(o) ? (r = ";", o++) : (r = null, l('";"')), null !== r && null !== (i = We()) ? r = [r, i] : (r = null, o = a);
            }null !== n ? e = [e, n] : (e = null, o = s);
          } else e = null, o = s;return e;
        }function We() {
          var e, t;for (e = [], t = Ye(); null !== t;) {
            e.push(t), t = Ye();
          }return e;
        }function Ye() {
          var e;return null === (e = b()) && null === (e = T()) && (58 === t.charCodeAt(o) ? (e = ":", o++) : (e = null, l('":"')), null === e && (64 === t.charCodeAt(o) ? (e = "@", o++) : (e = null, l('"@"')), null === e && (38 === t.charCodeAt(o) ? (e = "&", o++) : (e = null, l('"&"')), null === e && (61 === t.charCodeAt(o) ? (e = "=", o++) : (e = null, l('"="')), null === e && (43 === t.charCodeAt(o) ? (e = "+", o++) : (e = null, l('"+"')), null === e && (36 === t.charCodeAt(o) ? (e = "$", o++) : (e = null, l('"$"')), null === e && (44 === t.charCodeAt(o) ? (e = ",", o++) : (e = null, l('","'))))))))), e;
        }function Ke() {
          var e, n, r, i, s;if (i = o, s = o, null !== (e = d())) {
            for (n = [], null === (r = d()) && null === (r = c()) && (43 === t.charCodeAt(o) ? (r = "+", o++) : (r = null, l('"+"')), null === r && (45 === t.charCodeAt(o) ? (r = "-", o++) : (r = null, l('"-"')), null === r && (46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."'))))); null !== r;) {
              n.push(r), null === (r = d()) && null === (r = c()) && (43 === t.charCodeAt(o) ? (r = "+", o++) : (r = null, l('"+"')), null === r && (45 === t.charCodeAt(o) ? (r = "-", o++) : (r = null, l('"-"')), null === r && (46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."')))));
            }null !== n ? e = [e, n] : (e = null, o = s);
          } else e = null, o = s;return null !== e && (e = function (e) {
            Hn.scheme = t.substring(o, e);
          }(i)), null === e && (o = i), e;
        }function Je() {
          var e;return null === (e = Qe()) && (e = $e()), e;
        }function Qe() {
          var e, n, r, i;return r = o, i = o, null !== (e = te()) ? (64 === t.charCodeAt(o) ? (n = "@", o++) : (n = null, l('"@"')), null !== n ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), null !== (e = null !== e ? e : "") && null !== (n = oe()) ? e = [e, n] : (e = null, o = r), null !== e ? e : "";
        }function $e() {
          var e, n;if (null === (n = b()) && null === (n = T()) && (36 === t.charCodeAt(o) ? (n = "$", o++) : (n = null, l('"$"')), null === n && (44 === t.charCodeAt(o) ? (n = ",", o++) : (n = null, l('","')), null === n && (59 === t.charCodeAt(o) ? (n = ";", o++) : (n = null, l('";"')), null === n && (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null === n && (64 === t.charCodeAt(o) ? (n = "@", o++) : (n = null, l('"@"')), null === n && (38 === t.charCodeAt(o) ? (n = "&", o++) : (n = null, l('"&"')), null === n && (61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"')))))))))), null !== n) for (e = []; null !== n;) {
            e.push(n), null === (n = b()) && null === (n = T()) && (36 === t.charCodeAt(o) ? (n = "$", o++) : (n = null, l('"$"')), null === n && (44 === t.charCodeAt(o) ? (n = ",", o++) : (n = null, l('","')), null === n && (59 === t.charCodeAt(o) ? (n = ";", o++) : (n = null, l('";"')), null === n && (58 === t.charCodeAt(o) ? (n = ":", o++) : (n = null, l('":"')), null === n && (64 === t.charCodeAt(o) ? (n = "@", o++) : (n = null, l('"@"')), null === n && (38 === t.charCodeAt(o) ? (n = "&", o++) : (n = null, l('"&"')), null === n && (61 === t.charCodeAt(o) ? (n = "=", o++) : (n = null, l('"="')), null === n && (43 === t.charCodeAt(o) ? (n = "+", o++) : (n = null, l('"+"'))))))))));
          } else e = null;return e;
        }function Ze() {
          var e, t;for (e = [], t = ze(); null !== t;) {
            e.push(t), t = ze();
          }return e;
        }function Xe() {
          var e, n, r, i, s, a, u, d;if (u = o, d = o, "sip" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"SIP"')), null !== e) {
            if (47 === t.charCodeAt(o) ? (n = "/", o++) : (n = null, l('"/"')), null !== n) {
              if (null !== (i = c())) for (r = []; null !== i;) {
                r.push(i), i = c();
              } else r = null;if (null !== r) {
                if (46 === t.charCodeAt(o) ? (i = ".", o++) : (i = null, l('"."')), null !== i) {
                  if (null !== (a = c())) for (s = []; null !== a;) {
                    s.push(a), a = c();
                  } else s = null;null !== s ? e = [e, n, r, i, s] : (e = null, o = d);
                } else e = null, o = d;
              } else e = null, o = d;
            } else e = null, o = d;
          } else e = null, o = d;return null !== e && (e = function (e) {
            Hn.sip_version = t.substring(o, e);
          }(u)), null === e && (o = u), e;
        }function et() {
          var e;return "INVITE" === t.substr(o, 6) ? (e = "INVITE", o += 6) : (e = null, l('"INVITE"')), e;
        }function tt() {
          var e;return "ACK" === t.substr(o, 3) ? (e = "ACK", o += 3) : (e = null, l('"ACK"')), e;
        }function nt() {
          var e;return "OPTIONS" === t.substr(o, 7) ? (e = "OPTIONS", o += 7) : (e = null, l('"OPTIONS"')), e;
        }function rt() {
          var e;return "BYE" === t.substr(o, 3) ? (e = "BYE", o += 3) : (e = null, l('"BYE"')), e;
        }function it() {
          var e;return "CANCEL" === t.substr(o, 6) ? (e = "CANCEL", o += 6) : (e = null, l('"CANCEL"')), e;
        }function ot() {
          var e;return "REGISTER" === t.substr(o, 8) ? (e = "REGISTER", o += 8) : (e = null, l('"REGISTER"')), e;
        }function st() {
          var e;return "SUBSCRIBE" === t.substr(o, 9) ? (e = "SUBSCRIBE", o += 9) : (e = null, l('"SUBSCRIBE"')), e;
        }function at() {
          var e;return "NOTIFY" === t.substr(o, 6) ? (e = "NOTIFY", o += 6) : (e = null, l('"NOTIFY"')), e;
        }function lt() {
          var e;return "REFER" === t.substr(o, 5) ? (e = "REFER", o += 5) : (e = null, l('"REFER"')), e;
        }function ut() {
          var e, n;return n = o, null === (e = et()) && null === (e = tt()) && null === (e = nt()) && null === (e = rt()) && null === (e = it()) && null === (e = ot()) && null === (e = st()) && null === (e = at()) && null === (e = lt()) && (e = x()), null !== e && (e = function (e) {
            return Hn.method = t.substring(o, e), Hn.method;
          }(n)), null === e && (o = n), e;
        }function ct() {
          var e, t, n, r, i, s;return s = o, null !== (e = Xe()) && null !== (t = _()) && null !== (n = dt()) && null !== (r = _()) && null !== (i = ft()) ? e = [e, t, n, r, i] : (e = null, o = s), e;
        }function dt() {
          var e, t, n;return t = o, null !== (e = ht()) && (n = e, e = void (Hn.status_code = parseInt(n.join("")))), null === e && (o = t), e;
        }function ht() {
          var e, t, n, r;return r = o, null !== (e = c()) && null !== (t = c()) && null !== (n = c()) ? e = [e, t, n] : (e = null, o = r), e;
        }function ft() {
          var e, n, r;for (r = o, e = [], null === (n = y()) && null === (n = b()) && null === (n = T()) && null === (n = R()) && null === (n = k()) && null === (n = _()) && (n = m()); null !== n;) {
            e.push(n), null === (n = y()) && null === (n = b()) && null === (n = T()) && null === (n = R()) && null === (n = k()) && null === (n = _()) && (n = m());
          }return null !== e && (e = function (e) {
            Hn.reason_phrase = t.substring(o, e);
          }(r)), null === e && (o = r), e;
        }function pt() {
          var e, t, n, r, i, s, a;if (i = o, s = o, null === (e = Q()) && (e = gt()), null !== e) {
            for (t = [], a = o, null !== (n = q()) && null !== (r = mt()) ? n = [n, r] : (n = null, o = a); null !== n;) {
              t.push(n), a = o, null !== (n = q()) && null !== (r = mt()) ? n = [n, r] : (n = null, o = a);
            }null !== t ? e = [e, t] : (e = null, o = s);
          } else e = null, o = s;return null !== e && (e = function (e) {
            var t;Hn.multi_header || (Hn.multi_header = []);try {
              t = new Fn(Hn.uri, Hn.display_name, Hn.params), delete Hn.uri, delete Hn.display_name, delete Hn.params;
            } catch (e) {
              t = null;
            }Hn.multi_header.push({ possition: o, offset: e, parsed: t });
          }(i)), null === e && (o = i), e;
        }function gt() {
          var e, t, n, r, i;return i = o, null !== (e = null !== (e = _t()) ? e : "") && null !== (t = F()) && null !== (n = $()) && null !== (r = U()) ? e = [e, t, n, r] : (e = null, o = i), e;
        }function _t() {
          var e, t, n, r, i, s, a, l;if (i = o, s = o, null !== (e = x())) {
            for (t = [], a = o, null !== (n = w()) && null !== (r = x()) ? n = [n, r] : (n = null, o = a); null !== n;) {
              t.push(n), a = o, null !== (n = w()) && null !== (r = x()) ? n = [n, r] : (n = null, o = a);
            }null !== t ? e = [e, t] : (e = null, o = s);
          } else e = null, o = s;return null === e && (e = Y()), null !== e && (l = e, e = void (Hn.display_name = "string" == typeof l ? l : l[1].reduce(function (e, t) {
            return e + t[0] + t[1];
          }, l[0]))), null === e && (o = i), e;
        }function mt() {
          var e;return null === (e = vt()) && null === (e = yt()) && (e = Tt()), e;
        }function vt() {
          var e, n, r, i, s, a;return i = o, s = o, "q" === t.substr(o, 1).toLowerCase() ? (e = t.substr(o, 1), o++) : (e = null, l('"q"')), null !== e && null !== (n = P()) && null !== (r = Ct()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], Hn.params || (Hn.params = {}), e = void (Hn.params.q = a)), null === e && (o = i), e;
        }function yt() {
          var e, n, r, i, s, a;return i = o, s = o, "expires" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"expires"')), null !== e && null !== (n = P()) && null !== (r = bt()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], Hn.params || (Hn.params = {}), e = void (Hn.params.expires = a)), null === e && (o = i), e;
        }function bt() {
          var e, t, n;if (n = o, null !== (t = c())) for (e = []; null !== t;) {
            e.push(t), t = c();
          } else e = null;return null !== e && (e = parseInt(e.join(""))), null === e && (o = n), e;
        }function Ct() {
          var e, n, r, i, s, a, u, d;return a = o, u = o, 48 === t.charCodeAt(o) ? (e = "0", o++) : (e = null, l('"0"')), null !== e ? (d = o, 46 === t.charCodeAt(o) ? (n = ".", o++) : (n = null, l('"."')), null !== n && null !== (r = null !== (r = c()) ? r : "") && null !== (i = null !== (i = c()) ? i : "") && null !== (s = null !== (s = c()) ? s : "") ? n = [n, r, i, s] : (n = null, o = d), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = u)) : (e = null, o = u), null !== e && (e = function (e) {
            return parseFloat(t.substring(o, e));
          }(a)), null === e && (o = a), e;
        }function Tt() {
          var e, t, n, r, i, s, a, l;return r = o, i = o, null !== (e = x()) ? (s = o, null !== (t = P()) && null !== (n = wt()) ? t = [t, n] : (t = null, o = s), null !== (t = null !== t ? t : "") ? e = [e, t] : (e = null, o = i)) : (e = null, o = i), null !== e && (a = e[0], l = e[1], Hn.params || (Hn.params = {}), l = void 0 === l ? void 0 : l[1], e = void (Hn.params[a.toLowerCase()] = l)), null === e && (o = r), e;
        }function wt() {
          var e;return null === (e = x()) && null === (e = se()) && (e = W()), e;
        }function St() {
          var e;return "render" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"render"')), null === e && ("session" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"session"')), null === e && ("icon" === t.substr(o, 4).toLowerCase() ? (e = t.substr(o, 4), o += 4) : (e = null, l('"icon"')), null === e && ("alert" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"alert"')), null === e && (e = x())))), e;
        }function At() {
          var e;return null === (e = Et()) && (e = Tt()), e;
        }function Et() {
          var e, n, r, i;return i = o, "handling" === t.substr(o, 8).toLowerCase() ? (e = t.substr(o, 8), o += 8) : (e = null, l('"handling"')), null !== e && null !== (n = P()) ? ("optional" === t.substr(o, 8).toLowerCase() ? (r = t.substr(o, 8), o += 8) : (r = null, l('"optional"')), null === r && ("required" === t.substr(o, 8).toLowerCase() ? (r = t.substr(o, 8), o += 8) : (r = null, l('"required"')), null === r && (r = x())), null !== r ? e = [e, n, r] : (e = null, o = i)) : (e = null, o = i), e;
        }function It() {
          var e, t, n, r, i, s, a, l;if (a = o, null !== (e = Rt())) {
            if (null !== (t = L())) {
              if (null !== (n = Ot())) {
                for (r = [], l = o, null !== (i = q()) && null !== (s = Lt()) ? i = [i, s] : (i = null, o = l); null !== i;) {
                  r.push(i), l = o, null !== (i = q()) && null !== (s = Lt()) ? i = [i, s] : (i = null, o = l);
                }null !== r ? e = [e, t, n, r] : (e = null, o = a);
              } else e = null, o = a;
            } else e = null, o = a;
          } else e = null, o = a;return e;
        }function Rt() {
          var e;return null === (e = kt()) && (e = xt()), e;
        }function kt() {
          var e;return "text" === t.substr(o, 4).toLowerCase() ? (e = t.substr(o, 4), o += 4) : (e = null, l('"text"')), null === e && ("image" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"image"')), null === e && ("audio" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"audio"')), null === e && ("video" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"video"')), null === e && ("application" === t.substr(o, 11).toLowerCase() ? (e = t.substr(o, 11), o += 11) : (e = null, l('"application"')), null === e && (e = Mt()))))), e;
        }function xt() {
          var e;return "message" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"message"')), null === e && ("multipart" === t.substr(o, 9).toLowerCase() ? (e = t.substr(o, 9), o += 9) : (e = null, l('"multipart"')), null === e && (e = Mt())), e;
        }function Mt() {
          var e;return null === (e = x()) && (e = Dt()), e;
        }function Dt() {
          var e, n, r;return r = o, "x-" === t.substr(o, 2).toLowerCase() ? (e = t.substr(o, 2), o += 2) : (e = null, l('"x-"')), null !== e && null !== (n = x()) ? e = [e, n] : (e = null, o = r), e;
        }function Ot() {
          var e;return null === (e = Mt()) && (e = x()), e;
        }function Lt() {
          var e, t, n, r;return r = o, null !== (e = x()) && null !== (t = P()) && null !== (n = Pt()) ? e = [e, t, n] : (e = null, o = r), e;
        }function Pt() {
          var e;return null === (e = x()) && (e = W()), e;
        }function Nt() {
          var e, t, n, r;if (n = o, null !== (t = c())) for (e = []; null !== t;) {
            e.push(t), t = c();
          } else e = null;return null !== e && (r = e, e = void (Hn.value = parseInt(r.join("")))), null === e && (o = n), e;
        }function jt() {
          var e, n, r, i, s, a;if (s = o, null !== (e = M())) {
            for (n = [], a = o, 46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."')), null !== r && null !== (i = M()) ? r = [r, i] : (r = null, o = a); null !== r;) {
              n.push(r), a = o, 46 === t.charCodeAt(o) ? (r = ".", o++) : (r = null, l('"."')), null !== r && null !== (i = M()) ? r = [r, i] : (r = null, o = a);
            }null !== n ? e = [e, n] : (e = null, o = s);
          } else e = null, o = s;return e;
        }function Ut() {
          var e;return null === (e = Ft()) && (e = Tt()), e;
        }function Ft() {
          var e, n, r, i, s, a;return i = o, s = o, "tag" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"tag"')), null !== e && null !== (n = P()) && null !== (r = x()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.tag = a)), null === e && (o = i), e;
        }function Ht() {
          var e, n, r, i, s, a, u, c;if (u = o, "digest" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"Digest"')), null !== e) {
            if (null !== (n = w())) {
              if (null !== (r = Gt())) {
                for (i = [], c = o, null !== (s = H()) && null !== (a = Gt()) ? s = [s, a] : (s = null, o = c); null !== s;) {
                  i.push(s), c = o, null !== (s = H()) && null !== (a = Gt()) ? s = [s, a] : (s = null, o = c);
                }null !== i ? e = [e, n, r, i] : (e = null, o = u);
              } else e = null, o = u;
            } else e = null, o = u;
          } else e = null, o = u;return null === e && (e = qt()), e;
        }function qt() {
          var e, t, n, r, i, s, a, l;if (a = o, null !== (e = x())) {
            if (null !== (t = w())) {
              if (null !== (n = zt())) {
                for (r = [], l = o, null !== (i = H()) && null !== (s = zt()) ? i = [i, s] : (i = null, o = l); null !== i;) {
                  r.push(i), l = o, null !== (i = H()) && null !== (s = zt()) ? i = [i, s] : (i = null, o = l);
                }null !== r ? e = [e, t, n, r] : (e = null, o = a);
              } else e = null, o = a;
            } else e = null, o = a;
          } else e = null, o = a;return e;
        }function zt() {
          var e, t, n, r;return r = o, null !== (e = x()) && null !== (t = P()) ? (null === (n = x()) && (n = W()), null !== n ? e = [e, t, n] : (e = null, o = r)) : (e = null, o = r), e;
        }function Gt() {
          var e;return null === (e = Vt()) && null === (e = Wt()) && null === (e = Kt()) && null === (e = Qt()) && null === (e = $t()) && null === (e = Zt()) && null === (e = Xt()) && (e = zt()), e;
        }function Vt() {
          var e, n, r, i;return i = o, "realm" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"realm"')), null !== e && null !== (n = P()) && null !== (r = Bt()) ? e = [e, n, r] : (e = null, o = i), e;
        }function Bt() {
          var e, t, n;return t = o, null !== (e = Y()) && (n = e, e = void (Hn.realm = n)), null === e && (o = t), e;
        }function Wt() {
          var e, n, r, i, s, a, u, c, d;if (c = o, "domain" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"domain"')), null !== e) {
            if (null !== (n = P())) {
              if (null !== (r = G())) {
                if (null !== (i = Yt())) {
                  if (s = [], d = o, null !== (u = _())) for (a = []; null !== u;) {
                    a.push(u), u = _();
                  } else a = null;for (null !== a && null !== (u = Yt()) ? a = [a, u] : (a = null, o = d); null !== a;) {
                    if (s.push(a), d = o, null !== (u = _())) for (a = []; null !== u;) {
                      a.push(u), u = _();
                    } else a = null;null !== a && null !== (u = Yt()) ? a = [a, u] : (a = null, o = d);
                  }null !== s && null !== (a = V()) ? e = [e, n, r, i, s, a] : (e = null, o = c);
                } else e = null, o = c;
              } else e = null, o = c;
            } else e = null, o = c;
          } else e = null, o = c;return e;
        }function Yt() {
          var e;return null === (e = je()) && (e = He()), e;
        }function Kt() {
          var e, n, r, i;return i = o, "nonce" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"nonce"')), null !== e && null !== (n = P()) && null !== (r = Jt()) ? e = [e, n, r] : (e = null, o = i), e;
        }function Jt() {
          var e, t, n;return t = o, null !== (e = Y()) && (n = e, e = void (Hn.nonce = n)), null === e && (o = t), e;
        }function Qt() {
          var e, n, r, i, s, a;return i = o, s = o, "opaque" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"opaque"')), null !== e && null !== (n = P()) && null !== (r = Y()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.opaque = a)), null === e && (o = i), e;
        }function $t() {
          var e, n, r, i, s;return i = o, "stale" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"stale"')), null !== e && null !== (n = P()) ? (s = o, "true" === t.substr(o, 4).toLowerCase() ? (r = t.substr(o, 4), o += 4) : (r = null, l('"true"')), null !== r && (r = void (Hn.stale = !0)), null === r && (o = s), null === r && (s = o, "false" === t.substr(o, 5).toLowerCase() ? (r = t.substr(o, 5), o += 5) : (r = null, l('"false"')), null !== r && (r = void (Hn.stale = !1)), null === r && (o = s)), null !== r ? e = [e, n, r] : (e = null, o = i)) : (e = null, o = i), e;
        }function Zt() {
          var e, n, r, i, s, a;return i = o, s = o, "algorithm" === t.substr(o, 9).toLowerCase() ? (e = t.substr(o, 9), o += 9) : (e = null, l('"algorithm"')), null !== e && null !== (n = P()) ? ("md5" === t.substr(o, 3).toLowerCase() ? (r = t.substr(o, 3), o += 3) : (r = null, l('"MD5"')), null === r && ("md5-sess" === t.substr(o, 8).toLowerCase() ? (r = t.substr(o, 8), o += 8) : (r = null, l('"MD5-sess"')), null === r && (r = x())), null !== r ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.algorithm = a.toUpperCase())), null === e && (o = i), e;
        }function Xt() {
          var e, n, r, i, s, a, u, c, d, h;if (c = o, "qop" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"qop"')), null !== e) {
            if (null !== (n = P())) {
              if (null !== (r = G())) {
                if (d = o, null !== (i = en())) {
                  for (s = [], h = o, 44 === t.charCodeAt(o) ? (a = ",", o++) : (a = null, l('","')), null !== a && null !== (u = en()) ? a = [a, u] : (a = null, o = h); null !== a;) {
                    s.push(a), h = o, 44 === t.charCodeAt(o) ? (a = ",", o++) : (a = null, l('","')), null !== a && null !== (u = en()) ? a = [a, u] : (a = null, o = h);
                  }null !== s ? i = [i, s] : (i = null, o = d);
                } else i = null, o = d;null !== i && null !== (s = V()) ? e = [e, n, r, i, s] : (e = null, o = c);
              } else e = null, o = c;
            } else e = null, o = c;
          } else e = null, o = c;return e;
        }function en() {
          var e, n, r;return n = o, "auth-int" === t.substr(o, 8).toLowerCase() ? (e = t.substr(o, 8), o += 8) : (e = null, l('"auth-int"')), null === e && ("auth" === t.substr(o, 4).toLowerCase() ? (e = t.substr(o, 4), o += 4) : (e = null, l('"auth"')), null === e && (e = x())), null !== e && (r = e, Hn.qop || (Hn.qop = []), e = void Hn.qop.push(r.toLowerCase())), null === e && (o = n), e;
        }function tn() {
          var e, t, n, r, i, s, a;if (i = o, s = o, null !== (e = gt())) {
            for (t = [], a = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = a); null !== n;) {
              t.push(n), a = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = a);
            }null !== t ? e = [e, t] : (e = null, o = s);
          } else e = null, o = s;return null !== e && (e = function (e) {
            var t;Hn.multi_header || (Hn.multi_header = []);try {
              t = new Fn(Hn.uri, Hn.display_name, Hn.params), delete Hn.uri, delete Hn.display_name, delete Hn.params;
            } catch (e) {
              t = null;
            }Hn.multi_header.push({ possition: o, offset: e, parsed: t });
          }(i)), null === e && (o = i), e;
        }function nn() {
          var e;return null === (e = rn()) && (e = Tt()), e;
        }function rn() {
          var e, n, r, i, s, a, u;if (s = o, a = o, "cause" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"cause"')), null !== e) {
            if (null !== (n = P())) {
              if (null !== (i = c())) for (r = []; null !== i;) {
                r.push(i), i = c();
              } else r = null;null !== r ? e = [e, n, r] : (e = null, o = a);
            } else e = null, o = a;
          } else e = null, o = a;return null !== e && (u = e[2], e = void (Hn.cause = parseInt(u.join("")))), null === e && (o = s), e;
        }function on() {
          var e, t, n, r, i, s;if (i = o, null !== (e = gt())) {
            for (t = [], s = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = s); null !== n;) {
              t.push(n), s = o, null !== (n = q()) && null !== (r = Tt()) ? n = [n, r] : (n = null, o = s);
            }null !== t ? e = [e, t] : (e = null, o = i);
          } else e = null, o = i;return e;
        }function sn() {
          var e, n;return n = o, "active" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"active"')), null === e && ("pending" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"pending"')), null === e && ("terminated" === t.substr(o, 10).toLowerCase() ? (e = t.substr(o, 10), o += 10) : (e = null, l('"terminated"')), null === e && (e = x()))), null !== e && (e = function (e) {
            Hn.state = t.substring(o, e);
          }(n)), null === e && (o = n), e;
        }function an() {
          var e, n, r, i, s, a, u, c;return i = o, s = o, "reason" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"reason"')), null !== e && null !== (n = P()) && null !== (r = ln()) ? e = [e, n, r] : (e = null, o = s), null !== e && (e = void (void 0 !== (a = e[2]) && (Hn.reason = a))), null === e && (o = i), null === e && (i = o, s = o, "expires" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"expires"')), null !== e && null !== (n = P()) && null !== (r = bt()) ? e = [e, n, r] : (e = null, o = s), null !== e && (e = void (void 0 !== (c = e[2]) && (Hn.expires = c))), null === e && (o = i), null === e && (i = o, s = o, "retry_after" === t.substr(o, 11).toLowerCase() ? (e = t.substr(o, 11), o += 11) : (e = null, l('"retry_after"')), null !== e && null !== (n = P()) && null !== (r = bt()) ? e = [e, n, r] : (e = null, o = s), null !== e && (e = void (void 0 !== (u = e[2]) && (Hn.retry_after = u))), null === e && (o = i), null === e && (e = Tt()))), e;
        }function ln() {
          var e;return "deactivated" === t.substr(o, 11).toLowerCase() ? (e = t.substr(o, 11), o += 11) : (e = null, l('"deactivated"')), null === e && ("probation" === t.substr(o, 9).toLowerCase() ? (e = t.substr(o, 9), o += 9) : (e = null, l('"probation"')), null === e && ("rejected" === t.substr(o, 8).toLowerCase() ? (e = t.substr(o, 8), o += 8) : (e = null, l('"rejected"')), null === e && ("timeout" === t.substr(o, 7).toLowerCase() ? (e = t.substr(o, 7), o += 7) : (e = null, l('"timeout"')), null === e && ("giveup" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"giveup"')), null === e && ("noresource" === t.substr(o, 10).toLowerCase() ? (e = t.substr(o, 10), o += 10) : (e = null, l('"noresource"')), null === e && ("invariant" === t.substr(o, 9).toLowerCase() ? (e = t.substr(o, 9), o += 9) : (e = null, l('"invariant"')), null === e && (e = x()))))))), e;
        }function un() {
          var e;return null === (e = Ft()) && (e = Tt()), e;
        }function cn() {
          var e, t, n, r, i, s, a, l;if (a = o, null !== (e = vn())) {
            if (null !== (t = w())) {
              if (null !== (n = Cn())) {
                for (r = [], l = o, null !== (i = q()) && null !== (s = dn()) ? i = [i, s] : (i = null, o = l); null !== i;) {
                  r.push(i), l = o, null !== (i = q()) && null !== (s = dn()) ? i = [i, s] : (i = null, o = l);
                }null !== r ? e = [e, t, n, r] : (e = null, o = a);
              } else e = null, o = a;
            } else e = null, o = a;
          } else e = null, o = a;return e;
        }function dn() {
          var e;return null === (e = hn()) && null === (e = fn()) && null === (e = pn()) && null === (e = gn()) && null === (e = _n()) && (e = Tt()), e;
        }function hn() {
          var e, n, r, i, s, a;return i = o, s = o, "ttl" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"ttl"')), null !== e && null !== (n = P()) && null !== (r = Sn()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.ttl = a)), null === e && (o = i), e;
        }function fn() {
          var e, n, r, i, s, a;return i = o, s = o, "maddr" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"maddr"')), null !== e && null !== (n = P()) && null !== (r = se()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.maddr = a)), null === e && (o = i), e;
        }function pn() {
          var e, n, r, i, s, a;return i = o, s = o, "received" === t.substr(o, 8).toLowerCase() ? (e = t.substr(o, 8), o += 8) : (e = null, l('"received"')), null !== e && null !== (n = P()) ? (null === (r = pe()) && (r = de()), null !== r ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.received = a)), null === e && (o = i), e;
        }function gn() {
          var e, n, r, i, s, a;return i = o, s = o, "branch" === t.substr(o, 6).toLowerCase() ? (e = t.substr(o, 6), o += 6) : (e = null, l('"branch"')), null !== e && null !== (n = P()) && null !== (r = x()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.branch = a)), null === e && (o = i), e;
        }function _n() {
          var e, n, r, i, s;return i = o, "rport" === t.substr(o, 5).toLowerCase() ? (e = t.substr(o, 5), o += 5) : (e = null, l('"rport"')), null !== e ? (s = o, null !== (n = P()) && null !== (r = mn()) ? n = [n, r] : (n = null, o = s), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = i)) : (e = null, o = i), e;
        }function mn() {
          var e, t, n, r, i, s, a, l;return s = o, a = o, null !== (e = null !== (e = c()) ? e : "") && null !== (t = null !== (t = c()) ? t : "") && null !== (n = null !== (n = c()) ? n : "") && null !== (r = null !== (r = c()) ? r : "") && null !== (i = null !== (i = c()) ? i : "") ? e = [e, t, n, r, i] : (e = null, o = a), null !== e && (l = e, e = void (Hn.rport = parseInt(l.join("")))), null === e && (o = s), e;
        }function vn() {
          var e, t, n, r, i, s;return s = o, null !== (e = yn()) && null !== (t = L()) && null !== (n = x()) && null !== (r = L()) && null !== (i = bn()) ? e = [e, t, n, r, i] : (e = null, o = s), e;
        }function yn() {
          var e, n, r;return n = o, "sip" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"SIP"')), null === e && (e = x()), null !== e && (r = e, e = void (Hn.protocol = r)), null === e && (o = n), e;
        }function bn() {
          var e, n, r;return n = o, "udp" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"UDP"')), null === e && ("tcp" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"TCP"')), null === e && ("tls" === t.substr(o, 3).toLowerCase() ? (e = t.substr(o, 3), o += 3) : (e = null, l('"TLS"')), null === e && ("sctp" === t.substr(o, 4).toLowerCase() ? (e = t.substr(o, 4), o += 4) : (e = null, l('"SCTP"')), null === e && (e = x())))), null !== e && (r = e, e = void (Hn.transport = r)), null === e && (o = n), e;
        }function Cn() {
          var e, t, n, r, i;return r = o, null !== (e = Tn()) ? (i = o, null !== (t = z()) && null !== (n = wn()) ? t = [t, n] : (t = null, o = i), null !== (t = null !== t ? t : "") ? e = [e, t] : (e = null, o = r)) : (e = null, o = r), e;
        }function Tn() {
          var e, n;return n = o, null === (e = pe()) && null === (e = ce()) && (e = ae()), null !== e && (e = function (e) {
            Hn.host = t.substring(o, e);
          }(n)), null === e && (o = n), e;
        }function wn() {
          var e, t, n, r, i, s, a, l;return s = o, a = o, null !== (e = null !== (e = c()) ? e : "") && null !== (t = null !== (t = c()) ? t : "") && null !== (n = null !== (n = c()) ? n : "") && null !== (r = null !== (r = c()) ? r : "") && null !== (i = null !== (i = c()) ? i : "") ? e = [e, t, n, r, i] : (e = null, o = a), null !== e && (l = e, e = void (Hn.port = parseInt(l.join("")))), null === e && (o = s), e;
        }function Sn() {
          var e, t, n, r, i;return r = o, i = o, null !== (e = c()) && null !== (t = null !== (t = c()) ? t : "") && null !== (n = null !== (n = c()) ? n : "") ? e = [e, t, n] : (e = null, o = i), null !== e && (e = parseInt(e.join(""))), null === e && (o = r), e;
        }function An() {
          var e, t, n;return t = o, null !== (e = bt()) && (n = e, e = void (Hn.expires = n)), null === e && (o = t), e;
        }function En() {
          var e;return null === (e = In()) && (e = Tt()), e;
        }function In() {
          var e, n, r, i, s, a;return i = o, s = o, "refresher" === t.substr(o, 9).toLowerCase() ? (e = t.substr(o, 9), o += 9) : (e = null, l('"refresher"')), null !== e && null !== (n = P()) ? ("uac" === t.substr(o, 3).toLowerCase() ? (r = t.substr(o, 3), o += 3) : (r = null, l('"uac"')), null === r && ("uas" === t.substr(o, 3).toLowerCase() ? (r = t.substr(o, 3), o += 3) : (r = null, l('"uas"'))), null !== r ? e = [e, n, r] : (e = null, o = s)) : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.refresher = a.toLowerCase())), null === e && (o = i), e;
        }function Rn() {
          var e, t;for (e = [], null === (t = I()) && null === (t = k()) && (t = w()); null !== t;) {
            e.push(t), null === (t = I()) && null === (t = k()) && (t = w());
          }return e;
        }function kn() {
          var e, n, r, i, s, a, u, c, d, h, f;return h = o, f = o, null !== (e = Mn()) ? (45 === t.charCodeAt(o) ? (n = "-", o++) : (n = null, l('"-"')), null !== n && null !== (r = xn()) ? (45 === t.charCodeAt(o) ? (i = "-", o++) : (i = null, l('"-"')), null !== i && null !== (s = xn()) ? (45 === t.charCodeAt(o) ? (a = "-", o++) : (a = null, l('"-"')), null !== a && null !== (u = xn()) ? (45 === t.charCodeAt(o) ? (c = "-", o++) : (c = null, l('"-"')), null !== c && null !== (d = Dn()) ? e = [e, n, r, i, s, a, u, c, d] : (e = null, o = f)) : (e = null, o = f)) : (e = null, o = f)) : (e = null, o = f)) : (e = null, o = f), null !== e && (e = function (e, n) {
            Hn = t.substring(o + 5, e);
          }(h, e[0])), null === e && (o = h), e;
        }function xn() {
          var e, t, n, r, i;return i = o, null !== (e = h()) && null !== (t = h()) && null !== (n = h()) && null !== (r = h()) ? e = [e, t, n, r] : (e = null, o = i), e;
        }function Mn() {
          var e, t, n;return n = o, null !== (e = xn()) && null !== (t = xn()) ? e = [e, t] : (e = null, o = n), e;
        }function Dn() {
          var e, t, n, r;return r = o, null !== (e = xn()) && null !== (t = xn()) && null !== (n = xn()) ? e = [e, t, n] : (e = null, o = r), e;
        }function On() {
          var e, n, r, i, s, a;return i = o, s = o, null !== (e = D()) ? (a = o, 64 === t.charCodeAt(o) ? (n = "@", o++) : (n = null, l('"@"')), null !== n && null !== (r = D()) ? n = [n, r] : (n = null, o = a), null !== (n = null !== n ? n : "") ? e = [e, n] : (e = null, o = s)) : (e = null, o = s), null !== e && (e = function (e) {
            Hn.call_id = t.substring(o, e);
          }(i)), null === e && (o = i), e;
        }function Ln() {
          var e;return null === (e = Pn()) && null === (e = Nn()) && null === (e = jn()) && (e = Tt()), e;
        }function Pn() {
          var e, n, r, i, s, a;return i = o, s = o, "to-tag" === t.substr(o, 6) ? (e = "to-tag", o += 6) : (e = null, l('"to-tag"')), null !== e && null !== (n = P()) && null !== (r = x()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.to_tag = a)), null === e && (o = i), e;
        }function Nn() {
          var e, n, r, i, s, a;return i = o, s = o, "from-tag" === t.substr(o, 8) ? (e = "from-tag", o += 8) : (e = null, l('"from-tag"')), null !== e && null !== (n = P()) && null !== (r = x()) ? e = [e, n, r] : (e = null, o = s), null !== e && (a = e[2], e = void (Hn.from_tag = a)), null === e && (o = i), e;
        }function jn() {
          var e, n;return n = o, "early-only" === t.substr(o, 10) ? (e = "early-only", o += 10) : (e = null, l('"early-only"')), null !== e && (e = void (Hn.early_only = !0)), null === e && (o = n), e;
        }var Un = n(6),
            Fn = n(12),
            Hn = {};if (null === i[r]() || o !== t.length) {
          var qn = Math.max(o, s),
              zn = qn < t.length ? t.charAt(qn) : null,
              Gn = function () {
            for (var e = 1, n = 1, r = !1, i = 0; i < Math.max(o, s); i++) {
              var a = t.charAt(i);"\n" === a ? (r || e++, n = 1, r = !1) : "\r" === a || "\u2028" === a || "\u2029" === a ? (e++, n = 1, r = !0) : (n++, r = !1);
            }return { line: e, column: n };
          }();return new this.SyntaxError(function (e) {
            e.sort();for (var t = null, n = [], r = 0; r < e.length; r++) {
              e[r] !== t && (n.push(e[r]), t = e[r]);
            }return n;
          }(a), zn, qn, Gn.line, Gn.column), -1;
        }return Hn;
      }, toSource: function toSource() {
        return this._source;
      }, SyntaxError: function SyntaxError(t, n, r, i, o) {
        this.name = "SyntaxError", this.expected = t, this.found = n, this.message = function (t, n) {
          var r;switch (t.length) {case 0:
              r = "end of input";break;case 1:
              r = t[0];break;default:
              r = t.slice(0, t.length - 1).join(", ") + " or " + t[t.length - 1];}return "Expected " + r + " but " + (n ? e(n) : "end of input") + " found.";
        }(t, n), this.offset = r, this.line = i, this.column = o;
      } };return t.SyntaxError.prototype = Error.prototype, t;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && o(e, t);
  }function o(e, t) {
    return (o = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function s(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = l(e);if (t) {
        var i = l(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    return (l = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }function u(e, t) {
    var _n3;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n3 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return c(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? c(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n3 && (e = _n3);var r = 0,
            i = function i() {};return { s: i, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e4) {
            throw _e4;
          }, f: i };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var o,
        s = !0,
        a = !1;return { s: function s() {
        _n3 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n3.next();return s = e.done, e;
      }, e: function e(_e5) {
        a = !0, o = _e5;
      }, f: function f() {
        try {
          s || null == _n3.return || _n3.return();
        } finally {
          if (a) throw o;
        }
      } };
  }function c(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }function d(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function h(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function f(e, t, n) {
    return t && h(e.prototype, t), n && h(e, n), e;
  }var p = n(17),
      g = n(1),
      _ = n(0),
      m = n(2),
      v = n(12),
      y = n(3),
      b = new g("SIPMessage"),
      C = function () {
    function e(t, n, r, i, o, s) {
      if (d(this, e), !t || !n || !r) return null;i = i || {}, this.ua = r, this.headers = {}, this.method = t, this.ruri = n, this.body = s, this.extraHeaders = m.cloneArray(o), i.route_set ? this.setHeader("route", i.route_set) : r.configuration.use_preloaded_route && this.setHeader("route", "<".concat(r.transport.sip_uri, ";lr>")), this.setHeader("via", ""), this.setHeader("max-forwards", _.MAX_FORWARDS);var a = i.to_uri || n,
          l = i.to_tag ? { tag: i.to_tag } : null,
          u = void 0 !== i.to_display_name ? i.to_display_name : null;this.to = new v(a, u, l), this.setHeader("to", this.to.toString());var c,
          h = i.from_uri || r.configuration.uri,
          f = { tag: i.from_tag || m.newTag() };c = void 0 !== i.from_display_name ? i.from_display_name : r.configuration.display_name ? r.configuration.display_name : null, this.from = new v(h, c, f), this.setHeader("from", this.from.toString());var p = i.call_id || r.configuration.jssip_id + m.createRandomToken(15);this.call_id = p, this.setHeader("call-id", p);var g = i.cseq || Math.floor(1e4 * Math.random());this.cseq = g, this.setHeader("cseq", "".concat(g, " ").concat(t));
    }return f(e, [{ key: "setHeader", value: function value(e, t) {
        for (var n = new RegExp("^\\s*".concat(e, "\\s*:"), "i"), r = 0; r < this.extraHeaders.length; r++) {
          n.test(this.extraHeaders[r]) && this.extraHeaders.splice(r, 1);
        }this.headers[m.headerize(e)] = Array.isArray(t) ? t : [t];
      } }, { key: "getHeader", value: function value(e) {
        var t = this.headers[m.headerize(e)];if (t) {
          if (t[0]) return t[0];
        } else {
          var n,
              r = new RegExp("^\\s*".concat(e, "\\s*:"), "i"),
              i = u(this.extraHeaders);try {
            for (i.s(); !(n = i.n()).done;) {
              var o = n.value;if (r.test(o)) return o.substring(o.indexOf(":") + 1).trim();
            }
          } catch (e) {
            i.e(e);
          } finally {
            i.f();
          }
        }
      } }, { key: "getHeaders", value: function value(e) {
        var t = this.headers[m.headerize(e)],
            n = [];if (t) {
          var r,
              i = u(t);try {
            for (i.s(); !(r = i.n()).done;) {
              var o = r.value;n.push(o);
            }
          } catch (e) {
            i.e(e);
          } finally {
            i.f();
          }return n;
        }var s,
            a = new RegExp("^\\s*".concat(e, "\\s*:"), "i"),
            l = u(this.extraHeaders);try {
          for (l.s(); !(s = l.n()).done;) {
            var c = s.value;a.test(c) && n.push(c.substring(c.indexOf(":") + 1).trim());
          }
        } catch (e) {
          l.e(e);
        } finally {
          l.f();
        }return n;
      } }, { key: "hasHeader", value: function value(e) {
        if (this.headers[m.headerize(e)]) return !0;var t,
            n = new RegExp("^\\s*".concat(e, "\\s*:"), "i"),
            r = u(this.extraHeaders);try {
          for (r.s(); !(t = r.n()).done;) {
            var i = t.value;if (n.test(i)) return !0;
          }
        } catch (e) {
          r.e(e);
        } finally {
          r.f();
        }return !1;
      } }, { key: "parseSDP", value: function value(e) {
        return !e && this.sdp || (this.sdp = p.parse(this.body || "")), this.sdp;
      } }, { key: "toString", value: function value() {
        var e = "".concat(this.method, " ").concat(this.ruri, " SIP/2.0\r\n");for (var t in this.headers) {
          if (Object.prototype.hasOwnProperty.call(this.headers, t)) {
            var n,
                r = u(this.headers[t]);try {
              for (r.s(); !(n = r.n()).done;) {
                var i = n.value;e += "".concat(t, ": ").concat(i, "\r\n");
              }
            } catch (e) {
              r.e(e);
            } finally {
              r.f();
            }
          }
        }var o,
            s = u(this.extraHeaders);try {
          for (s.s(); !(o = s.n()).done;) {
            var a = o.value;e += "".concat(a.trim(), "\r\n");
          }
        } catch (e) {
          s.e(e);
        } finally {
          s.f();
        }var l = [];switch (this.method) {case _.REGISTER:
            l.push("path", "gruu");break;case _.INVITE:
            this.ua.configuration.session_timers && l.push("timer"), (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) && l.push("gruu"), l.push("ice", "replaces");break;case _.UPDATE:
            this.ua.configuration.session_timers && l.push("timer"), l.push("ice");}l.push("outbound");var c = this.ua.configuration.user_agent || _.USER_AGENT;if (e += "Allow: ".concat(_.ALLOWED_METHODS, "\r\n"), e += "Supported: ".concat(l, "\r\n"), e += "User-Agent: ".concat(c, "\r\n"), this.body) {
          var d = m.str_utf8_length(this.body);e += "Content-Length: ".concat(d, "\r\n\r\n"), e += this.body;
        } else e += "Content-Length: 0\r\n\r\n";return e;
      } }, { key: "clone", value: function value() {
        var t = new e(this.method, this.ruri, this.ua);return Object.keys(this.headers).forEach(function (e) {
          t.headers[e] = this.headers[e].slice();
        }, this), t.body = this.body, t.extraHeaders = m.cloneArray(this.extraHeaders), t.to = this.to, t.from = this.from, t.call_id = this.call_id, t.cseq = this.cseq, t;
      } }]), e;
  }(),
      T = function (e) {
    i(n, e);var t = s(n);function n(e, r, i, o, s) {
      var a;return d(this, n), (a = t.call(this, _.INVITE, e, r, i, o, s)).transaction = null, a;
    }return f(n, [{ key: "cancel", value: function value(e) {
        this.transaction.cancel(e);
      } }, { key: "clone", value: function value() {
        var e = new n(this.ruri, this.ua);return Object.keys(this.headers).forEach(function (t) {
          e.headers[t] = this.headers[t].slice();
        }, this), e.body = this.body, e.extraHeaders = m.cloneArray(this.extraHeaders), e.to = this.to, e.from = this.from, e.call_id = this.call_id, e.cseq = this.cseq, e.transaction = this.transaction, e;
      } }]), n;
  }(C),
      w = function () {
    function e() {
      d(this, e), this.data = null, this.headers = null, this.method = null, this.via = null, this.via_branch = null, this.call_id = null, this.cseq = null, this.from = null, this.from_tag = null, this.to = null, this.to_tag = null, this.body = null, this.sdp = null;
    }return f(e, [{ key: "addHeader", value: function value(e, t) {
        var n = { raw: t };e = m.headerize(e), this.headers[e] ? this.headers[e].push(n) : this.headers[e] = [n];
      } }, { key: "getHeader", value: function value(e) {
        var t = this.headers[m.headerize(e)];if (t) return t[0] ? t[0].raw : void 0;
      } }, { key: "getHeaders", value: function value(e) {
        var t = this.headers[m.headerize(e)],
            n = [];if (!t) return [];var r,
            i = u(t);try {
          for (i.s(); !(r = i.n()).done;) {
            var o = r.value;n.push(o.raw);
          }
        } catch (e) {
          i.e(e);
        } finally {
          i.f();
        }return n;
      } }, { key: "hasHeader", value: function value(e) {
        return !!this.headers[m.headerize(e)];
      } }, { key: "parseHeader", value: function value(e) {
        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;if (e = m.headerize(e), this.headers[e]) {
          if (!(t >= this.headers[e].length)) {
            var n = this.headers[e][t],
                r = n.raw;if (n.parsed) return n.parsed;var i = y.parse(r, e.replace(/-/g, "_"));return -1 === i ? (this.headers[e].splice(t, 1), void b.debug('error parsing "'.concat(e, '" header field with value "').concat(r, '"'))) : (n.parsed = i, i);
          }b.debug('not so many "'.concat(e, '" headers present'));
        } else b.debug('header "'.concat(e, '" not present'));
      } }, { key: "s", value: function value(e, t) {
        return this.parseHeader(e, t);
      } }, { key: "setHeader", value: function value(e, t) {
        var n = { raw: t };this.headers[m.headerize(e)] = [n];
      } }, { key: "parseSDP", value: function value(e) {
        return !e && this.sdp || (this.sdp = p.parse(this.body || "")), this.sdp;
      } }, { key: "toString", value: function value() {
        return this.data;
      } }]), e;
  }(),
      S = function (e) {
    i(n, e);var t = s(n);function n(e) {
      var r;return d(this, n), (r = t.call(this)).ua = e, r.headers = {}, r.ruri = null, r.transport = null, r.server_transaction = null, r;
    }return f(n, [{ key: "reply", value: function value(e, t, n, r, i, o) {
        var s = [],
            a = this.getHeader("To");if (t = t || null, !(e = e || null) || e < 100 || e > 699) throw new TypeError("Invalid status_code: ".concat(e));if (t && "string" != typeof t && !(t instanceof String)) throw new TypeError("Invalid reason_phrase: ".concat(t));t = t || _.REASON_PHRASE[e] || "", n = m.cloneArray(n);var l = "SIP/2.0 ".concat(e, " ").concat(t, "\r\n");if (this.method === _.INVITE && e > 100 && e <= 200) {
          var c,
              d = u(this.getHeaders("record-route"));try {
            for (d.s(); !(c = d.n()).done;) {
              var h = c.value;l += "Record-Route: ".concat(h, "\r\n");
            }
          } catch (e) {
            d.e(e);
          } finally {
            d.f();
          }
        }var f,
            p = u(this.getHeaders("via"));try {
          for (p.s(); !(f = p.n()).done;) {
            var g = f.value;l += "Via: ".concat(g, "\r\n");
          }
        } catch (e) {
          p.e(e);
        } finally {
          p.f();
        }!this.to_tag && e > 100 ? a += ";tag=".concat(m.newTag()) : this.to_tag && !this.s("to").hasParam("tag") && (a += ";tag=".concat(this.to_tag)), l += "To: ".concat(a, "\r\n"), l += "From: ".concat(this.getHeader("From"), "\r\n"), l += "Call-ID: ".concat(this.call_id, "\r\n"), l += "CSeq: ".concat(this.cseq, " ").concat(this.method, "\r\n");var v,
            y = u(n);try {
          for (y.s(); !(v = y.n()).done;) {
            var b = v.value;l += "".concat(b.trim(), "\r\n");
          }
        } catch (e) {
          y.e(e);
        } finally {
          y.f();
        }switch (this.method) {case _.INVITE:
            this.ua.configuration.session_timers && s.push("timer"), (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) && s.push("gruu"), s.push("ice", "replaces");break;case _.UPDATE:
            this.ua.configuration.session_timers && s.push("timer"), r && s.push("ice"), s.push("replaces");}if (s.push("outbound"), this.method === _.OPTIONS ? (l += "Allow: ".concat(_.ALLOWED_METHODS, "\r\n"), l += "Accept: ".concat(_.ACCEPTED_BODY_TYPES, "\r\n")) : 405 === e ? l += "Allow: ".concat(_.ALLOWED_METHODS, "\r\n") : 415 === e && (l += "Accept: ".concat(_.ACCEPTED_BODY_TYPES, "\r\n")), l += "Supported: ".concat(s, "\r\n"), r) {
          var C = m.str_utf8_length(r);l += "Content-Type: application/sdp\r\n", l += "Content-Length: ".concat(C, "\r\n\r\n"), l += r;
        } else l += "Content-Length: ".concat(0, "\r\n\r\n");this.server_transaction.receiveResponse(e, l, i, o);
      } }, { key: "reply_sl", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null,
            t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null,
            n = this.getHeaders("via");if (!e || e < 100 || e > 699) throw new TypeError("Invalid status_code: ".concat(e));if (t && "string" != typeof t && !(t instanceof String)) throw new TypeError("Invalid reason_phrase: ".concat(t));t = t || _.REASON_PHRASE[e] || "";var r,
            i = "SIP/2.0 ".concat(e, " ").concat(t, "\r\n"),
            o = u(n);try {
          for (o.s(); !(r = o.n()).done;) {
            var s = r.value;i += "Via: ".concat(s, "\r\n");
          }
        } catch (e) {
          o.e(e);
        } finally {
          o.f();
        }var a = this.getHeader("To");!this.to_tag && e > 100 ? a += ";tag=".concat(m.newTag()) : this.to_tag && !this.s("to").hasParam("tag") && (a += ";tag=".concat(this.to_tag)), i += "To: ".concat(a, "\r\n"), i += "From: ".concat(this.getHeader("From"), "\r\n"), i += "Call-ID: ".concat(this.call_id, "\r\n"), i += "CSeq: ".concat(this.cseq, " ").concat(this.method, "\r\n"), i += "Content-Length: ".concat(0, "\r\n\r\n"), this.transport.send(i);
      } }]), n;
  }(w),
      A = function (e) {
    i(n, e);var t = s(n);function n() {
      var e;return d(this, n), (e = t.call(this)).headers = {}, e.status_code = null, e.reason_phrase = null, e;
    }return n;
  }(w);e.exports = { OutgoingRequest: C, InitialOutgoingInviteRequest: T, IncomingRequest: S, IncomingResponse: A };
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function o(e, t) {
    if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && d(e, t);
  }function s(e) {
    var t = c();return function () {
      var n,
          r = h(e);if (t) {
        var i = h(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    var t = "function" == typeof Map ? new Map() : void 0;return (l = function l(e) {
      if (null === e || (n = e, -1 === Function.toString.call(n).indexOf("[native code]"))) return e;var n;if ("function" != typeof e) throw new TypeError("Super expression must either be null or a function");if (void 0 !== t) {
        if (t.has(e)) return t.get(e);t.set(e, r);
      }function r() {
        return u(e, arguments, h(this).constructor);
      }return r.prototype = Object.create(e.prototype, { constructor: { value: r, enumerable: !1, writable: !0, configurable: !0 } }), d(r, e);
    })(e);
  }function u(e, t, n) {
    return (u = c() ? Reflect.construct : function (e, t, n) {
      var r = [null];r.push.apply(r, t);var i = new (Function.bind.apply(e, r))();return n && d(i, n.prototype), i;
    }).apply(null, arguments);
  }function c() {
    if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
      return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
    } catch (e) {
      return !1;
    }
  }function d(e, t) {
    return (d = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function h(e) {
    return (h = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var f = function (e) {
    o(n, e);var t = s(n);function n(e, r) {
      var o;return i(this, n), (o = t.call(this)).code = 1, o.name = "CONFIGURATION_ERROR", o.parameter = e, o.value = r, o.message = o.value ? "Invalid value ".concat(JSON.stringify(o.value), ' for parameter "').concat(o.parameter, '"') : "Missing parameter: ".concat(o.parameter), o;
    }return n;
  }(l(Error)),
      p = function (e) {
    o(n, e);var t = s(n);function n(e) {
      var r;return i(this, n), (r = t.call(this)).code = 2, r.name = "INVALID_STATE_ERROR", r.status = e, r.message = "Invalid status: ".concat(e), r;
    }return n;
  }(l(Error)),
      g = function (e) {
    o(n, e);var t = s(n);function n(e) {
      var r;return i(this, n), (r = t.call(this)).code = 3, r.name = "NOT_SUPPORTED_ERROR", r.message = e, r;
    }return n;
  }(l(Error)),
      _ = function (e) {
    o(n, e);var t = s(n);function n(e) {
      var r;return i(this, n), (r = t.call(this)).code = 4, r.name = "NOT_READY_ERROR", r.message = e, r;
    }return n;
  }(l(Error));e.exports = { ConfigurationError: f, InvalidStateError: p, NotSupportedError: g, NotReadyError: _ };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    var _n4;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n4 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return i(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? i(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n4 && (e = _n4);var r = 0,
            o = function o() {};return { s: o, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e6) {
            throw _e6;
          }, f: o };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var s,
        a = !0,
        l = !1;return { s: function s() {
        _n4 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n4.next();return a = e.done, e;
      }, e: function e(_e7) {
        l = !0, s = _e7;
      }, f: function f() {
        try {
          a || null == _n4.return || _n4.return();
        } finally {
          if (l) throw s;
        }
      } };
  }function i(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }function o(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function s(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function a(e, t, n) {
    return t && s(e.prototype, t), n && s(e, n), e;
  }var l = n(0),
      u = n(2),
      c = n(3);e.exports = function () {
    function e(t, n, r, i) {
      var s = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : {},
          a = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : {};if (o(this, e), !r) throw new TypeError('missing or invalid "host" parameter');for (var u in this._parameters = {}, this._headers = {}, this._scheme = t || l.SIP, this._user = n, this._host = r, this._port = i, s) {
        Object.prototype.hasOwnProperty.call(s, u) && this.setParam(u, s[u]);
      }for (var c in a) {
        Object.prototype.hasOwnProperty.call(a, c) && this.setHeader(c, a[c]);
      }
    }return a(e, null, [{ key: "parse", value: function value(e) {
        return -1 !== (e = c.parse(e, "SIP_URI")) ? e : void 0;
      } }]), a(e, [{ key: "setParam", value: function value(e, t) {
        e && (this._parameters[e.toLowerCase()] = null == t ? null : t.toString());
      } }, { key: "getParam", value: function value(e) {
        if (e) return this._parameters[e.toLowerCase()];
      } }, { key: "hasParam", value: function value(e) {
        if (e) return !!this._parameters.hasOwnProperty(e.toLowerCase());
      } }, { key: "deleteParam", value: function value(e) {
        if (e = e.toLowerCase(), this._parameters.hasOwnProperty(e)) {
          var t = this._parameters[e];return delete this._parameters[e], t;
        }
      } }, { key: "clearParams", value: function value() {
        this._parameters = {};
      } }, { key: "setHeader", value: function value(e, t) {
        this._headers[u.headerize(e)] = Array.isArray(t) ? t : [t];
      } }, { key: "getHeader", value: function value(e) {
        if (e) return this._headers[u.headerize(e)];
      } }, { key: "hasHeader", value: function value(e) {
        if (e) return !!this._headers.hasOwnProperty(u.headerize(e));
      } }, { key: "deleteHeader", value: function value(e) {
        if (e = u.headerize(e), this._headers.hasOwnProperty(e)) {
          var t = this._headers[e];return delete this._headers[e], t;
        }
      } }, { key: "clearHeaders", value: function value() {
        this._headers = {};
      } }, { key: "clone", value: function value() {
        return new e(this._scheme, this._user, this._host, this._port, JSON.parse(JSON.stringify(this._parameters)), JSON.parse(JSON.stringify(this._headers)));
      } }, { key: "toString", value: function value() {
        var e = [],
            t = "".concat(this._scheme, ":");for (var n in this._user && (t += "".concat(u.escapeUser(this._user), "@")), t += this._host, (this._port || 0 === this._port) && (t += ":".concat(this._port)), this._parameters) {
          Object.prototype.hasOwnProperty.call(this._parameters, n) && (t += ";".concat(n), null !== this._parameters[n] && (t += "=".concat(this._parameters[n])));
        }for (var i in this._headers) {
          if (Object.prototype.hasOwnProperty.call(this._headers, i)) {
            var o,
                s = r(this._headers[i]);try {
              for (s.s(); !(o = s.n()).done;) {
                var a = o.value;e.push("".concat(i, "=").concat(a));
              }
            } catch (e) {
              s.e(e);
            } finally {
              s.f();
            }
          }
        }return e.length > 0 && (t += "?".concat(e.join("&"))), t;
      } }, { key: "toAor", value: function value(e) {
        var t = "".concat(this._scheme, ":");return this._user && (t += "".concat(u.escapeUser(this._user), "@")), t += this._host, e && (this._port || 0 === this._port) && (t += ":".concat(this._port)), t;
      } }, { key: "scheme", get: function get() {
        return this._scheme;
      }, set: function set(e) {
        this._scheme = e.toLowerCase();
      } }, { key: "user", get: function get() {
        return this._user;
      }, set: function set(e) {
        this._user = e;
      } }, { key: "host", get: function get() {
        return this._host;
      }, set: function set(e) {
        this._host = e.toLowerCase();
      } }, { key: "port", get: function get() {
        return this._port;
      }, set: function set(e) {
        this._port = 0 === e ? e : parseInt(e, 10) || null;
      } }]), e;
  }();
}, function (e, t, n) {
  "use strict";
  var r,
      i = "object" == (typeof Reflect === "undefined" ? "undefined" : (0, _typeof3.default)(Reflect)) ? Reflect : null,
      o = i && "function" == typeof i.apply ? i.apply : function (e, t, n) {
    return Function.prototype.apply.call(e, t, n);
  };r = i && "function" == typeof i.ownKeys ? i.ownKeys : Object.getOwnPropertySymbols ? function (e) {
    return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
  } : function (e) {
    return Object.getOwnPropertyNames(e);
  };var s = Number.isNaN || function (e) {
    return e != e;
  };function a() {
    a.init.call(this);
  }e.exports = a, e.exports.once = function (e, t) {
    return new Promise(function (n, r) {
      function i(n) {
        e.removeListener(t, o), r(n);
      }function o() {
        "function" == typeof e.removeListener && e.removeListener("error", i), n([].slice.call(arguments));
      }m(e, t, o, { once: !0 }), "error" !== t && function (e, t, n) {
        "function" == typeof e.on && m(e, "error", t, n);
      }(e, i, { once: !0 });
    });
  }, a.EventEmitter = a, a.prototype._events = void 0, a.prototype._eventsCount = 0, a.prototype._maxListeners = void 0;var l = 10;function u(e) {
    if ("function" != typeof e) throw new TypeError('The "listener" argument must be of type Function. Received type ' + (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)));
  }function c(e) {
    return void 0 === e._maxListeners ? a.defaultMaxListeners : e._maxListeners;
  }function d(e, t, n, r) {
    var i, o, s, a;if (u(n), void 0 === (o = e._events) ? (o = e._events = Object.create(null), e._eventsCount = 0) : (void 0 !== o.newListener && (e.emit("newListener", t, n.listener ? n.listener : n), o = e._events), s = o[t]), void 0 === s) s = o[t] = n, ++e._eventsCount;else if ("function" == typeof s ? s = o[t] = r ? [n, s] : [s, n] : r ? s.unshift(n) : s.push(n), (i = c(e)) > 0 && s.length > i && !s.warned) {
      s.warned = !0;var l = new Error("Possible EventEmitter memory leak detected. " + s.length + " " + String(t) + " listeners added. Use emitter.setMaxListeners() to increase limit");l.name = "MaxListenersExceededWarning", l.emitter = e, l.type = t, l.count = s.length, a = l, console && console.warn && console.warn(a);
    }return e;
  }function h() {
    if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, 0 === arguments.length ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }function f(e, t, n) {
    var r = { fired: !1, wrapFn: void 0, target: e, type: t, listener: n },
        i = h.bind(r);return i.listener = n, r.wrapFn = i, i;
  }function p(e, t, n) {
    var r = e._events;if (void 0 === r) return [];var i = r[t];return void 0 === i ? [] : "function" == typeof i ? n ? [i.listener || i] : [i] : n ? function (e) {
      for (var t = new Array(e.length), n = 0; n < t.length; ++n) {
        t[n] = e[n].listener || e[n];
      }return t;
    }(i) : _(i, i.length);
  }function g(e) {
    var t = this._events;if (void 0 !== t) {
      var n = t[e];if ("function" == typeof n) return 1;if (void 0 !== n) return n.length;
    }return 0;
  }function _(e, t) {
    for (var n = new Array(t), r = 0; r < t; ++r) {
      n[r] = e[r];
    }return n;
  }function m(e, t, n, r) {
    if ("function" == typeof e.on) r.once ? e.once(t, n) : e.on(t, n);else {
      if ("function" != typeof e.addEventListener) throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)));e.addEventListener(t, function i(o) {
        r.once && e.removeEventListener(t, i), n(o);
      });
    }
  }Object.defineProperty(a, "defaultMaxListeners", { enumerable: !0, get: function get() {
      return l;
    }, set: function set(e) {
      if ("number" != typeof e || e < 0 || s(e)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + e + ".");l = e;
    } }), a.init = function () {
    void 0 !== this._events && this._events !== Object.getPrototypeOf(this)._events || (this._events = Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  }, a.prototype.setMaxListeners = function (e) {
    if ("number" != typeof e || e < 0 || s(e)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e + ".");return this._maxListeners = e, this;
  }, a.prototype.getMaxListeners = function () {
    return c(this);
  }, a.prototype.emit = function (e) {
    for (var t = [], n = 1; n < arguments.length; n++) {
      t.push(arguments[n]);
    }var r = "error" === e,
        i = this._events;if (void 0 !== i) r = r && void 0 === i.error;else if (!r) return !1;if (r) {
      var s;if (t.length > 0 && (s = t[0]), s instanceof Error) throw s;var a = new Error("Unhandled error." + (s ? " (" + s.message + ")" : ""));throw a.context = s, a;
    }var l = i[e];if (void 0 === l) return !1;if ("function" == typeof l) o(l, this, t);else {
      var u = l.length,
          c = _(l, u);for (n = 0; n < u; ++n) {
        o(c[n], this, t);
      }
    }return !0;
  }, a.prototype.addListener = function (e, t) {
    return d(this, e, t, !1);
  }, a.prototype.on = a.prototype.addListener, a.prototype.prependListener = function (e, t) {
    return d(this, e, t, !0);
  }, a.prototype.once = function (e, t) {
    return u(t), this.on(e, f(this, e, t)), this;
  }, a.prototype.prependOnceListener = function (e, t) {
    return u(t), this.prependListener(e, f(this, e, t)), this;
  }, a.prototype.removeListener = function (e, t) {
    var n, r, i, o, s;if (u(t), void 0 === (r = this._events)) return this;if (void 0 === (n = r[e])) return this;if (n === t || n.listener === t) 0 == --this._eventsCount ? this._events = Object.create(null) : (delete r[e], r.removeListener && this.emit("removeListener", e, n.listener || t));else if ("function" != typeof n) {
      for (i = -1, o = n.length - 1; o >= 0; o--) {
        if (n[o] === t || n[o].listener === t) {
          s = n[o].listener, i = o;break;
        }
      }if (i < 0) return this;0 === i ? n.shift() : function (e, t) {
        for (; t + 1 < e.length; t++) {
          e[t] = e[t + 1];
        }e.pop();
      }(n, i), 1 === n.length && (r[e] = n[0]), void 0 !== r.removeListener && this.emit("removeListener", e, s || t);
    }return this;
  }, a.prototype.off = a.prototype.removeListener, a.prototype.removeAllListeners = function (e) {
    var t, n, r;if (void 0 === (n = this._events)) return this;if (void 0 === n.removeListener) return 0 === arguments.length ? (this._events = Object.create(null), this._eventsCount = 0) : void 0 !== n[e] && (0 == --this._eventsCount ? this._events = Object.create(null) : delete n[e]), this;if (0 === arguments.length) {
      var i,
          o = Object.keys(n);for (r = 0; r < o.length; ++r) {
        "removeListener" !== (i = o[r]) && this.removeAllListeners(i);
      }return this.removeAllListeners("removeListener"), this._events = Object.create(null), this._eventsCount = 0, this;
    }if ("function" == typeof (t = n[e])) this.removeListener(e, t);else if (void 0 !== t) for (r = t.length - 1; r >= 0; r--) {
      this.removeListener(e, t[r]);
    }return this;
  }, a.prototype.listeners = function (e) {
    return p(this, e, !0);
  }, a.prototype.rawListeners = function (e) {
    return p(this, e, !1);
  }, a.listenerCount = function (e, t) {
    return "function" == typeof e.listenerCount ? e.listenerCount(t) : g.call(e, t);
  }, a.prototype.listenerCount = g, a.prototype.eventNames = function () {
    return this._eventsCount > 0 ? r(this._events) : [];
  };
}, function (e, t, n) {
  "use strict";
  var r = { generateIdentifier: function generateIdentifier() {
      return Math.random().toString(36).substr(2, 10);
    } };r.localCName = r.generateIdentifier(), r.splitLines = function (e) {
    return e.trim().split("\n").map(function (e) {
      return e.trim();
    });
  }, r.splitSections = function (e) {
    return e.split("\nm=").map(function (e, t) {
      return (t > 0 ? "m=" + e : e).trim() + "\r\n";
    });
  }, r.getDescription = function (e) {
    var t = r.splitSections(e);return t && t[0];
  }, r.getMediaSections = function (e) {
    var t = r.splitSections(e);return t.shift(), t;
  }, r.matchPrefix = function (e, t) {
    return r.splitLines(e).filter(function (e) {
      return 0 === e.indexOf(t);
    });
  }, r.parseCandidate = function (e) {
    for (var t, n = { foundation: (t = 0 === e.indexOf("a=candidate:") ? e.substring(12).split(" ") : e.substring(10).split(" "))[0], component: parseInt(t[1], 10), protocol: t[2].toLowerCase(), priority: parseInt(t[3], 10), ip: t[4], address: t[4], port: parseInt(t[5], 10), type: t[7] }, r = 8; r < t.length; r += 2) {
      switch (t[r]) {case "raddr":
          n.relatedAddress = t[r + 1];break;case "rport":
          n.relatedPort = parseInt(t[r + 1], 10);break;case "tcptype":
          n.tcpType = t[r + 1];break;case "ufrag":
          n.ufrag = t[r + 1], n.usernameFragment = t[r + 1];break;default:
          n[t[r]] = t[r + 1];}
    }return n;
  }, r.writeCandidate = function (e) {
    var t = [];t.push(e.foundation), t.push(e.component), t.push(e.protocol.toUpperCase()), t.push(e.priority), t.push(e.address || e.ip), t.push(e.port);var n = e.type;return t.push("typ"), t.push(n), "host" !== n && e.relatedAddress && e.relatedPort && (t.push("raddr"), t.push(e.relatedAddress), t.push("rport"), t.push(e.relatedPort)), e.tcpType && "tcp" === e.protocol.toLowerCase() && (t.push("tcptype"), t.push(e.tcpType)), (e.usernameFragment || e.ufrag) && (t.push("ufrag"), t.push(e.usernameFragment || e.ufrag)), "candidate:" + t.join(" ");
  }, r.parseIceOptions = function (e) {
    return e.substr(14).split(" ");
  }, r.parseRtpMap = function (e) {
    var t = e.substr(9).split(" "),
        n = { payloadType: parseInt(t.shift(), 10) };return t = t[0].split("/"), n.name = t[0], n.clockRate = parseInt(t[1], 10), n.channels = 3 === t.length ? parseInt(t[2], 10) : 1, n.numChannels = n.channels, n;
  }, r.writeRtpMap = function (e) {
    var t = e.payloadType;void 0 !== e.preferredPayloadType && (t = e.preferredPayloadType);var n = e.channels || e.numChannels || 1;return "a=rtpmap:" + t + " " + e.name + "/" + e.clockRate + (1 !== n ? "/" + n : "") + "\r\n";
  }, r.parseExtmap = function (e) {
    var t = e.substr(9).split(" ");return { id: parseInt(t[0], 10), direction: t[0].indexOf("/") > 0 ? t[0].split("/")[1] : "sendrecv", uri: t[1] };
  }, r.writeExtmap = function (e) {
    return "a=extmap:" + (e.id || e.preferredId) + (e.direction && "sendrecv" !== e.direction ? "/" + e.direction : "") + " " + e.uri + "\r\n";
  }, r.parseFmtp = function (e) {
    for (var t, n = {}, r = e.substr(e.indexOf(" ") + 1).split(";"), i = 0; i < r.length; i++) {
      n[(t = r[i].trim().split("="))[0].trim()] = t[1];
    }return n;
  }, r.writeFmtp = function (e) {
    var t = "",
        n = e.payloadType;if (void 0 !== e.preferredPayloadType && (n = e.preferredPayloadType), e.parameters && Object.keys(e.parameters).length) {
      var r = [];Object.keys(e.parameters).forEach(function (t) {
        e.parameters[t] ? r.push(t + "=" + e.parameters[t]) : r.push(t);
      }), t += "a=fmtp:" + n + " " + r.join(";") + "\r\n";
    }return t;
  }, r.parseRtcpFb = function (e) {
    var t = e.substr(e.indexOf(" ") + 1).split(" ");return { type: t.shift(), parameter: t.join(" ") };
  }, r.writeRtcpFb = function (e) {
    var t = "",
        n = e.payloadType;return void 0 !== e.preferredPayloadType && (n = e.preferredPayloadType), e.rtcpFeedback && e.rtcpFeedback.length && e.rtcpFeedback.forEach(function (e) {
      t += "a=rtcp-fb:" + n + " " + e.type + (e.parameter && e.parameter.length ? " " + e.parameter : "") + "\r\n";
    }), t;
  }, r.parseSsrcMedia = function (e) {
    var t = e.indexOf(" "),
        n = { ssrc: parseInt(e.substr(7, t - 7), 10) },
        r = e.indexOf(":", t);return r > -1 ? (n.attribute = e.substr(t + 1, r - t - 1), n.value = e.substr(r + 1)) : n.attribute = e.substr(t + 1), n;
  }, r.parseSsrcGroup = function (e) {
    var t = e.substr(13).split(" ");return { semantics: t.shift(), ssrcs: t.map(function (e) {
        return parseInt(e, 10);
      }) };
  }, r.getMid = function (e) {
    var t = r.matchPrefix(e, "a=mid:")[0];if (t) return t.substr(6);
  }, r.parseFingerprint = function (e) {
    var t = e.substr(14).split(" ");return { algorithm: t[0].toLowerCase(), value: t[1] };
  }, r.getDtlsParameters = function (e, t) {
    return { role: "auto", fingerprints: r.matchPrefix(e + t, "a=fingerprint:").map(r.parseFingerprint) };
  }, r.writeDtlsParameters = function (e, t) {
    var n = "a=setup:" + t + "\r\n";return e.fingerprints.forEach(function (e) {
      n += "a=fingerprint:" + e.algorithm + " " + e.value + "\r\n";
    }), n;
  }, r.getIceParameters = function (e, t) {
    var n = r.splitLines(e);return { usernameFragment: (n = n.concat(r.splitLines(t))).filter(function (e) {
        return 0 === e.indexOf("a=ice-ufrag:");
      })[0].substr(12), password: n.filter(function (e) {
        return 0 === e.indexOf("a=ice-pwd:");
      })[0].substr(10) };
  }, r.writeIceParameters = function (e) {
    return "a=ice-ufrag:" + e.usernameFragment + "\r\na=ice-pwd:" + e.password + "\r\n";
  }, r.parseRtpParameters = function (e) {
    for (var t = { codecs: [], headerExtensions: [], fecMechanisms: [], rtcp: [] }, n = r.splitLines(e)[0].split(" "), i = 3; i < n.length; i++) {
      var o = n[i],
          s = r.matchPrefix(e, "a=rtpmap:" + o + " ")[0];if (s) {
        var a = r.parseRtpMap(s),
            l = r.matchPrefix(e, "a=fmtp:" + o + " ");switch (a.parameters = l.length ? r.parseFmtp(l[0]) : {}, a.rtcpFeedback = r.matchPrefix(e, "a=rtcp-fb:" + o + " ").map(r.parseRtcpFb), t.codecs.push(a), a.name.toUpperCase()) {case "RED":case "ULPFEC":
            t.fecMechanisms.push(a.name.toUpperCase());}
      }
    }return r.matchPrefix(e, "a=extmap:").forEach(function (e) {
      t.headerExtensions.push(r.parseExtmap(e));
    }), t;
  }, r.writeRtpDescription = function (e, t) {
    var n = "";n += "m=" + e + " ", n += t.codecs.length > 0 ? "9" : "0", n += " UDP/TLS/RTP/SAVPF ", n += t.codecs.map(function (e) {
      return void 0 !== e.preferredPayloadType ? e.preferredPayloadType : e.payloadType;
    }).join(" ") + "\r\n", n += "c=IN IP4 0.0.0.0\r\n", n += "a=rtcp:9 IN IP4 0.0.0.0\r\n", t.codecs.forEach(function (e) {
      n += r.writeRtpMap(e), n += r.writeFmtp(e), n += r.writeRtcpFb(e);
    });var i = 0;return t.codecs.forEach(function (e) {
      e.maxptime > i && (i = e.maxptime);
    }), i > 0 && (n += "a=maxptime:" + i + "\r\n"), n += "a=rtcp-mux\r\n", t.headerExtensions && t.headerExtensions.forEach(function (e) {
      n += r.writeExtmap(e);
    }), n;
  }, r.parseRtpEncodingParameters = function (e) {
    var t,
        n = [],
        i = r.parseRtpParameters(e),
        o = -1 !== i.fecMechanisms.indexOf("RED"),
        s = -1 !== i.fecMechanisms.indexOf("ULPFEC"),
        a = r.matchPrefix(e, "a=ssrc:").map(function (e) {
      return r.parseSsrcMedia(e);
    }).filter(function (e) {
      return "cname" === e.attribute;
    }),
        l = a.length > 0 && a[0].ssrc,
        u = r.matchPrefix(e, "a=ssrc-group:FID").map(function (e) {
      return e.substr(17).split(" ").map(function (e) {
        return parseInt(e, 10);
      });
    });u.length > 0 && u[0].length > 1 && u[0][0] === l && (t = u[0][1]), i.codecs.forEach(function (e) {
      if ("RTX" === e.name.toUpperCase() && e.parameters.apt) {
        var r = { ssrc: l, codecPayloadType: parseInt(e.parameters.apt, 10) };l && t && (r.rtx = { ssrc: t }), n.push(r), o && ((r = JSON.parse(JSON.stringify(r))).fec = { ssrc: l, mechanism: s ? "red+ulpfec" : "red" }, n.push(r));
      }
    }), 0 === n.length && l && n.push({ ssrc: l });var c = r.matchPrefix(e, "b=");return c.length && (c = 0 === c[0].indexOf("b=TIAS:") ? parseInt(c[0].substr(7), 10) : 0 === c[0].indexOf("b=AS:") ? 1e3 * parseInt(c[0].substr(5), 10) * .95 - 16e3 : void 0, n.forEach(function (e) {
      e.maxBitrate = c;
    })), n;
  }, r.parseRtcpParameters = function (e) {
    var t = {},
        n = r.matchPrefix(e, "a=ssrc:").map(function (e) {
      return r.parseSsrcMedia(e);
    }).filter(function (e) {
      return "cname" === e.attribute;
    })[0];n && (t.cname = n.value, t.ssrc = n.ssrc);var i = r.matchPrefix(e, "a=rtcp-rsize");t.reducedSize = i.length > 0, t.compound = 0 === i.length;var o = r.matchPrefix(e, "a=rtcp-mux");return t.mux = o.length > 0, t;
  }, r.parseMsid = function (e) {
    var t,
        n = r.matchPrefix(e, "a=msid:");if (1 === n.length) return { stream: (t = n[0].substr(7).split(" "))[0], track: t[1] };var i = r.matchPrefix(e, "a=ssrc:").map(function (e) {
      return r.parseSsrcMedia(e);
    }).filter(function (e) {
      return "msid" === e.attribute;
    });return i.length > 0 ? { stream: (t = i[0].value.split(" "))[0], track: t[1] } : void 0;
  }, r.parseSctpDescription = function (e) {
    var t,
        n = r.parseMLine(e),
        i = r.matchPrefix(e, "a=max-message-size:");i.length > 0 && (t = parseInt(i[0].substr(19), 10)), isNaN(t) && (t = 65536);var o = r.matchPrefix(e, "a=sctp-port:");if (o.length > 0) return { port: parseInt(o[0].substr(12), 10), protocol: n.fmt, maxMessageSize: t };if (r.matchPrefix(e, "a=sctpmap:").length > 0) {
      var s = r.matchPrefix(e, "a=sctpmap:")[0].substr(10).split(" ");return { port: parseInt(s[0], 10), protocol: s[1], maxMessageSize: t };
    }
  }, r.writeSctpDescription = function (e, t) {
    var n = [];return n = "DTLS/SCTP" !== e.protocol ? ["m=" + e.kind + " 9 " + e.protocol + " " + t.protocol + "\r\n", "c=IN IP4 0.0.0.0\r\n", "a=sctp-port:" + t.port + "\r\n"] : ["m=" + e.kind + " 9 " + e.protocol + " " + t.port + "\r\n", "c=IN IP4 0.0.0.0\r\n", "a=sctpmap:" + t.port + " " + t.protocol + " 65535\r\n"], void 0 !== t.maxMessageSize && n.push("a=max-message-size:" + t.maxMessageSize + "\r\n"), n.join("");
  }, r.generateSessionId = function () {
    return Math.random().toString().substr(2, 21);
  }, r.writeSessionBoilerplate = function (e, t, n) {
    var i = void 0 !== t ? t : 2;return "v=0\r\no=" + (n || "thisisadapterortc") + " " + (e || r.generateSessionId()) + " " + i + " IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";
  }, r.writeMediaSection = function (e, t, n, i) {
    var o = r.writeRtpDescription(e.kind, t);if (o += r.writeIceParameters(e.iceGatherer.getLocalParameters()), o += r.writeDtlsParameters(e.dtlsTransport.getLocalParameters(), "offer" === n ? "actpass" : "active"), o += "a=mid:" + e.mid + "\r\n", e.direction ? o += "a=" + e.direction + "\r\n" : e.rtpSender && e.rtpReceiver ? o += "a=sendrecv\r\n" : e.rtpSender ? o += "a=sendonly\r\n" : e.rtpReceiver ? o += "a=recvonly\r\n" : o += "a=inactive\r\n", e.rtpSender) {
      var s = "msid:" + i.id + " " + e.rtpSender.track.id + "\r\n";o += "a=" + s, o += "a=ssrc:" + e.sendEncodingParameters[0].ssrc + " " + s, e.sendEncodingParameters[0].rtx && (o += "a=ssrc:" + e.sendEncodingParameters[0].rtx.ssrc + " " + s, o += "a=ssrc-group:FID " + e.sendEncodingParameters[0].ssrc + " " + e.sendEncodingParameters[0].rtx.ssrc + "\r\n");
    }return o += "a=ssrc:" + e.sendEncodingParameters[0].ssrc + " cname:" + r.localCName + "\r\n", e.rtpSender && e.sendEncodingParameters[0].rtx && (o += "a=ssrc:" + e.sendEncodingParameters[0].rtx.ssrc + " cname:" + r.localCName + "\r\n"), o;
  }, r.getDirection = function (e, t) {
    for (var n = r.splitLines(e), i = 0; i < n.length; i++) {
      switch (n[i]) {case "a=sendrecv":case "a=sendonly":case "a=recvonly":case "a=inactive":
          return n[i].substr(2);}
    }return t ? r.getDirection(t) : "sendrecv";
  }, r.getKind = function (e) {
    return r.splitLines(e)[0].split(" ")[0].substr(2);
  }, r.isRejected = function (e) {
    return "0" === e.split(" ", 2)[1];
  }, r.parseMLine = function (e) {
    var t = r.splitLines(e)[0].substr(2).split(" ");return { kind: t[0], port: parseInt(t[1], 10), protocol: t[2], fmt: t.slice(3).join(" ") };
  }, r.parseOLine = function (e) {
    var t = r.matchPrefix(e, "o=")[0].substr(2).split(" ");return { username: t[0], sessionId: t[1], sessionVersion: parseInt(t[2], 10), netType: t[3], addressType: t[4], address: t[5] };
  }, r.isValidSDP = function (e) {
    if ("string" != typeof e || 0 === e.length) return !1;for (var t = r.splitLines(e), n = 0; n < t.length; n++) {
      if (t[n].length < 2 || "=" !== t[n].charAt(1)) return !1;
    }return !0;
  }, e.exports = r;
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(1),
      o = n(0),
      s = n(36),
      a = n(10),
      l = new i("RequestSender"),
      u = { onRequestTimeout: function onRequestTimeout() {}, onTransportError: function onTransportError() {}, onReceiveResponse: function onReceiveResponse() {}, onAuthenticated: function onAuthenticated() {} };e.exports = function () {
    function e(t, n, r) {
      for (var i in function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), this._ua = t, this._eventHandlers = r, this._method = n.method, this._request = n, this._auth = null, this._challenged = !1, this._staled = !1, u) {
        Object.prototype.hasOwnProperty.call(u, i) && (this._eventHandlers[i] || (this._eventHandlers[i] = u[i]));
      }t.status !== t.C.STATUS_USER_CLOSED || this._method === o.BYE && this._method === o.ACK || this._eventHandlers.onTransportError();
    }var t, n, i;return t = e, (n = [{ key: "send", value: function value() {
        var e = this,
            t = { onRequestTimeout: function onRequestTimeout() {
            e._eventHandlers.onRequestTimeout();
          }, onTransportError: function onTransportError() {
            e._eventHandlers.onTransportError();
          }, onReceiveResponse: function onReceiveResponse(t) {
            e._receiveResponse(t);
          } };switch (this._method) {case "INVITE":
            this.clientTransaction = new a.InviteClientTransaction(this._ua, this._ua.transport, this._request, t);break;case "ACK":
            this.clientTransaction = new a.AckClientTransaction(this._ua, this._ua.transport, this._request, t);break;default:
            this.clientTransaction = new a.NonInviteClientTransaction(this._ua, this._ua.transport, this._request, t);}this._ua._configuration.authorization_jwt && this._request.setHeader("Authorization", this._ua._configuration.authorization_jwt), this.clientTransaction.send();
      } }, { key: "_receiveResponse", value: function value(e) {
        var t,
            n,
            r = e.status_code;if (401 !== r && 407 !== r || null === this._ua.configuration.password && null === this._ua.configuration.ha1) this._eventHandlers.onReceiveResponse(e);else {
          if (401 === e.status_code ? (t = e.parseHeader("www-authenticate"), n = "authorization") : (t = e.parseHeader("proxy-authenticate"), n = "proxy-authorization"), !t) return l.debug("".concat(e.status_code, " with wrong or missing challenge, cannot authenticate")), void this._eventHandlers.onReceiveResponse(e);if (!this._challenged || !this._staled && !0 === t.stale) {
            if (this._auth || (this._auth = new s({ username: this._ua.configuration.authorization_user, password: this._ua.configuration.password, realm: this._ua.configuration.realm, ha1: this._ua.configuration.ha1 })), !this._auth.authenticate(this._request, t)) return void this._eventHandlers.onReceiveResponse(e);this._challenged = !0, this._ua.set("realm", this._auth.get("realm")), this._ua.set("ha1", this._auth.get("ha1")), t.stale && (this._staled = !0), this._request = this._request.clone(), this._request.cseq += 1, this._request.setHeader("cseq", "".concat(this._request.cseq, " ").concat(this._method)), this._request.setHeader(n, this._auth.toString()), this._eventHandlers.onAuthenticated(this._request), this.send();
          } else this._eventHandlers.onReceiveResponse(e);
        }
      } }]) && r(t.prototype, n), i && r(t, i), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function o(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function s(e, t, n) {
    return t && o(e.prototype, t), n && o(e, n), e;
  }function a(e, t) {
    if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && l(e, t);
  }function l(e, t) {
    return (l = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function u(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = h(e);if (t) {
        var i = h(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return c(this, n);
    };
  }function c(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? d(e) : t;
  }function d(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
  }function h(e) {
    return (h = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var f = n(7).EventEmitter,
      p = n(1),
      g = n(0),
      _ = n(4),
      m = n(19),
      v = new p("NonInviteClientTransaction"),
      y = new p("InviteClientTransaction"),
      b = new p("AckClientTransaction"),
      C = new p("NonInviteServerTransaction"),
      T = new p("InviteServerTransaction"),
      w = { STATUS_TRYING: 1, STATUS_PROCEEDING: 2, STATUS_CALLING: 3, STATUS_ACCEPTED: 4, STATUS_COMPLETED: 5, STATUS_TERMINATED: 6, STATUS_CONFIRMED: 7, NON_INVITE_CLIENT: "nict", NON_INVITE_SERVER: "nist", INVITE_CLIENT: "ict", INVITE_SERVER: "ist" },
      S = function (e) {
    a(n, e);var t = u(n);function n(e, r, o, s) {
      var a;i(this, n), (a = t.call(this)).type = w.NON_INVITE_CLIENT, a.id = "z9hG4bK".concat(Math.floor(1e7 * Math.random())), a.ua = e, a.transport = r, a.request = o, a.eventHandlers = s;var l = "SIP/2.0/".concat(r.via_transport);return l += " ".concat(e.configuration.via_host, ";branch=").concat(a.id), a.request.setHeader("via", l), a.ua.newTransaction(d(a)), a;
    }return s(n, [{ key: "stateChanged", value: function value(e) {
        this.state = e, this.emit("stateChanged");
      } }, { key: "send", value: function value() {
        var e = this;this.stateChanged(w.STATUS_TRYING), this.F = setTimeout(function () {
          e.timer_F();
        }, m.TIMER_F), this.transport.send(this.request) || this.onTransportError();
      } }, { key: "onTransportError", value: function value() {
        v.debug("transport error occurred, deleting transaction ".concat(this.id)), clearTimeout(this.F), clearTimeout(this.K), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this), this.eventHandlers.onTransportError();
      } }, { key: "timer_F", value: function value() {
        v.debug("Timer F expired for transaction ".concat(this.id)), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this), this.eventHandlers.onRequestTimeout();
      } }, { key: "timer_K", value: function value() {
        this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this);
      } }, { key: "receiveResponse", value: function value(e) {
        var t = this,
            n = e.status_code;if (n < 200) switch (this.state) {case w.STATUS_TRYING:case w.STATUS_PROCEEDING:
            this.stateChanged(w.STATUS_PROCEEDING), this.eventHandlers.onReceiveResponse(e);} else switch (this.state) {case w.STATUS_TRYING:case w.STATUS_PROCEEDING:
            this.stateChanged(w.STATUS_COMPLETED), clearTimeout(this.F), 408 === n ? this.eventHandlers.onRequestTimeout() : this.eventHandlers.onReceiveResponse(e), this.K = setTimeout(function () {
              t.timer_K();
            }, m.TIMER_K);}
      } }, { key: "C", get: function get() {
        return w;
      } }]), n;
  }(f),
      A = function (e) {
    a(n, e);var t = u(n);function n(e, r, o, s) {
      var a;i(this, n), (a = t.call(this)).type = w.INVITE_CLIENT, a.id = "z9hG4bK".concat(Math.floor(1e7 * Math.random())), a.ua = e, a.transport = r, a.request = o, a.eventHandlers = s, o.transaction = d(a);var l = "SIP/2.0/".concat(r.via_transport);return l += " ".concat(e.configuration.via_host, ";branch=").concat(a.id), a.request.setHeader("via", l), a.ua.newTransaction(d(a)), a;
    }return s(n, [{ key: "stateChanged", value: function value(e) {
        this.state = e, this.emit("stateChanged");
      } }, { key: "send", value: function value() {
        var e = this;this.stateChanged(w.STATUS_CALLING), this.B = setTimeout(function () {
          e.timer_B();
        }, m.TIMER_B), this.transport.send(this.request) || this.onTransportError();
      } }, { key: "onTransportError", value: function value() {
        clearTimeout(this.B), clearTimeout(this.D), clearTimeout(this.M), this.state !== w.STATUS_ACCEPTED && (y.debug("transport error occurred, deleting transaction ".concat(this.id)), this.eventHandlers.onTransportError()), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this);
      } }, { key: "timer_M", value: function value() {
        y.debug("Timer M expired for transaction ".concat(this.id)), this.state === w.STATUS_ACCEPTED && (clearTimeout(this.B), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this));
      } }, { key: "timer_B", value: function value() {
        y.debug("Timer B expired for transaction ".concat(this.id)), this.state === w.STATUS_CALLING && (this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this), this.eventHandlers.onRequestTimeout());
      } }, { key: "timer_D", value: function value() {
        y.debug("Timer D expired for transaction ".concat(this.id)), clearTimeout(this.B), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this);
      } }, { key: "sendACK", value: function value(e) {
        var t = this,
            n = new _.OutgoingRequest(g.ACK, this.request.ruri, this.ua, { route_set: this.request.getHeaders("route"), call_id: this.request.getHeader("call-id"), cseq: this.request.cseq });n.setHeader("from", this.request.getHeader("from")), n.setHeader("via", this.request.getHeader("via")), n.setHeader("to", e.getHeader("to")), this.D = setTimeout(function () {
          t.timer_D();
        }, m.TIMER_D), this.transport.send(n);
      } }, { key: "cancel", value: function value(e) {
        if (this.state === w.STATUS_PROCEEDING) {
          var t = new _.OutgoingRequest(g.CANCEL, this.request.ruri, this.ua, { route_set: this.request.getHeaders("route"), call_id: this.request.getHeader("call-id"), cseq: this.request.cseq });t.setHeader("from", this.request.getHeader("from")), t.setHeader("via", this.request.getHeader("via")), t.setHeader("to", this.request.getHeader("to")), e && t.setHeader("reason", e), this.transport.send(t);
        }
      } }, { key: "receiveResponse", value: function value(e) {
        var t = this,
            n = e.status_code;if (n >= 100 && n <= 199) switch (this.state) {case w.STATUS_CALLING:
            this.stateChanged(w.STATUS_PROCEEDING), this.eventHandlers.onReceiveResponse(e);break;case w.STATUS_PROCEEDING:
            this.eventHandlers.onReceiveResponse(e);} else if (n >= 200 && n <= 299) switch (this.state) {case w.STATUS_CALLING:case w.STATUS_PROCEEDING:
            this.stateChanged(w.STATUS_ACCEPTED), this.M = setTimeout(function () {
              t.timer_M();
            }, m.TIMER_M), this.eventHandlers.onReceiveResponse(e);break;case w.STATUS_ACCEPTED:
            this.eventHandlers.onReceiveResponse(e);} else if (n >= 300 && n <= 699) switch (this.state) {case w.STATUS_CALLING:case w.STATUS_PROCEEDING:
            this.stateChanged(w.STATUS_COMPLETED), this.sendACK(e), this.eventHandlers.onReceiveResponse(e);break;case w.STATUS_COMPLETED:
            this.sendACK(e);}
      } }, { key: "C", get: function get() {
        return w;
      } }]), n;
  }(f),
      E = function (e) {
    a(n, e);var t = u(n);function n(e, r, o, s) {
      var a;i(this, n), (a = t.call(this)).id = "z9hG4bK".concat(Math.floor(1e7 * Math.random())), a.transport = r, a.request = o, a.eventHandlers = s;var l = "SIP/2.0/".concat(r.via_transport);return l += " ".concat(e.configuration.via_host, ";branch=").concat(a.id), a.request.setHeader("via", l), a;
    }return s(n, [{ key: "send", value: function value() {
        this.transport.send(this.request) || this.onTransportError();
      } }, { key: "onTransportError", value: function value() {
        b.debug("transport error occurred for transaction ".concat(this.id)), this.eventHandlers.onTransportError();
      } }, { key: "C", get: function get() {
        return w;
      } }]), n;
  }(f),
      I = function (e) {
    a(n, e);var t = u(n);function n(e, r, o) {
      var s;return i(this, n), (s = t.call(this)).type = w.NON_INVITE_SERVER, s.id = o.via_branch, s.ua = e, s.transport = r, s.request = o, s.last_response = "", o.server_transaction = d(s), s.state = w.STATUS_TRYING, e.newTransaction(d(s)), s;
    }return s(n, [{ key: "stateChanged", value: function value(e) {
        this.state = e, this.emit("stateChanged");
      } }, { key: "timer_J", value: function value() {
        C.debug("Timer J expired for transaction ".concat(this.id)), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this);
      } }, { key: "onTransportError", value: function value() {
        this.transportError || (this.transportError = !0, C.debug("transport error occurred, deleting transaction ".concat(this.id)), clearTimeout(this.J), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this));
      } }, { key: "receiveResponse", value: function value(e, t, n, r) {
        var i = this;if (100 === e) switch (this.state) {case w.STATUS_TRYING:
            this.stateChanged(w.STATUS_PROCEEDING), this.transport.send(t) || this.onTransportError();break;case w.STATUS_PROCEEDING:
            this.last_response = t, this.transport.send(t) ? n && n() : (this.onTransportError(), r && r());} else if (e >= 200 && e <= 699) switch (this.state) {case w.STATUS_TRYING:case w.STATUS_PROCEEDING:
            this.stateChanged(w.STATUS_COMPLETED), this.last_response = t, this.J = setTimeout(function () {
              i.timer_J();
            }, m.TIMER_J), this.transport.send(t) ? n && n() : (this.onTransportError(), r && r());}
      } }, { key: "C", get: function get() {
        return w;
      } }]), n;
  }(f),
      R = function (e) {
    a(n, e);var t = u(n);function n(e, r, o) {
      var s;return i(this, n), (s = t.call(this)).type = w.INVITE_SERVER, s.id = o.via_branch, s.ua = e, s.transport = r, s.request = o, s.last_response = "", o.server_transaction = d(s), s.state = w.STATUS_PROCEEDING, e.newTransaction(d(s)), s.resendProvisionalTimer = null, o.reply(100), s;
    }return s(n, [{ key: "stateChanged", value: function value(e) {
        this.state = e, this.emit("stateChanged");
      } }, { key: "timer_H", value: function value() {
        T.debug("Timer H expired for transaction ".concat(this.id)), this.state === w.STATUS_COMPLETED && T.debug("ACK not received, dialog will be terminated"), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this);
      } }, { key: "timer_I", value: function value() {
        this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this);
      } }, { key: "timer_L", value: function value() {
        T.debug("Timer L expired for transaction ".concat(this.id)), this.state === w.STATUS_ACCEPTED && (this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this));
      } }, { key: "onTransportError", value: function value() {
        this.transportError || (this.transportError = !0, T.debug("transport error occurred, deleting transaction ".concat(this.id)), null !== this.resendProvisionalTimer && (clearInterval(this.resendProvisionalTimer), this.resendProvisionalTimer = null), clearTimeout(this.L), clearTimeout(this.H), clearTimeout(this.I), this.stateChanged(w.STATUS_TERMINATED), this.ua.destroyTransaction(this));
      } }, { key: "resend_provisional", value: function value() {
        this.transport.send(this.last_response) || this.onTransportError();
      } }, { key: "receiveResponse", value: function value(e, t, n, r) {
        var i = this;if (e >= 100 && e <= 199) switch (this.state) {case w.STATUS_PROCEEDING:
            this.transport.send(t) || this.onTransportError(), this.last_response = t;}if (e > 100 && e <= 199 && this.state === w.STATUS_PROCEEDING) null === this.resendProvisionalTimer && (this.resendProvisionalTimer = setInterval(function () {
          i.resend_provisional();
        }, m.PROVISIONAL_RESPONSE_INTERVAL));else if (e >= 200 && e <= 299) switch (this.state) {case w.STATUS_PROCEEDING:
            this.stateChanged(w.STATUS_ACCEPTED), this.last_response = t, this.L = setTimeout(function () {
              i.timer_L();
            }, m.TIMER_L), null !== this.resendProvisionalTimer && (clearInterval(this.resendProvisionalTimer), this.resendProvisionalTimer = null);case w.STATUS_ACCEPTED:
            this.transport.send(t) ? n && n() : (this.onTransportError(), r && r());} else if (e >= 300 && e <= 699) switch (this.state) {case w.STATUS_PROCEEDING:
            null !== this.resendProvisionalTimer && (clearInterval(this.resendProvisionalTimer), this.resendProvisionalTimer = null), this.transport.send(t) ? (this.stateChanged(w.STATUS_COMPLETED), this.H = setTimeout(function () {
              i.timer_H();
            }, m.TIMER_H), n && n()) : (this.onTransportError(), r && r());}
      } }, { key: "C", get: function get() {
        return w;
      } }]), n;
  }(f);e.exports = { C: w, NonInviteClientTransaction: S, InviteClientTransaction: A, AckClientTransaction: E, NonInviteServerTransaction: I, InviteServerTransaction: R, checkTransaction: function checkTransaction(e, t) {
      var n,
          r = e._transactions;switch (t.method) {case g.INVITE:
          if (n = r.ist[t.via_branch]) {
            switch (n.state) {case w.STATUS_PROCEEDING:
                n.transport.send(n.last_response);}return !0;
          }break;case g.ACK:
          if (!(n = r.ist[t.via_branch])) return !1;if (n.state === w.STATUS_ACCEPTED) return !1;if (n.state === w.STATUS_COMPLETED) return n.state = w.STATUS_CONFIRMED, n.I = setTimeout(function () {
            n.timer_I();
          }, m.TIMER_I), !0;break;case g.CANCEL:
          return (n = r.ist[t.via_branch]) ? (t.reply_sl(200), n.state !== w.STATUS_PROCEEDING) : (t.reply_sl(481), !0);default:
          if (n = r.nist[t.via_branch]) {
            switch (n.state) {case w.STATUS_TRYING:
                break;case w.STATUS_PROCEEDING:case w.STATUS_COMPLETED:
                n.transport.send(n.last_response);}return !0;
          }}
    } };
}, function (e, t, n) {
  "use strict";
  var r = n(16),
      i = n(0),
      o = n(5),
      s = n(2),
      a = n(30),
      l = n(6),
      u = n(12),
      c = n(3),
      d = n(49);n(13)("JsSIP")("version %s", r.version), e.exports = { C: i, Exceptions: o, Utils: s, UA: a, URI: l, NameAddrHeader: u, WebSocketInterface: d, Grammar: c, debug: n(13), get name() {
      return r.title;
    }, get version() {
      return r.version;
    } };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function i(e, t, n) {
    return t && r(e.prototype, t), n && r(e, n), e;
  }var o = n(6),
      s = n(3);e.exports = function () {
    function e(t, n, r) {
      if (function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), !(t && t instanceof o)) throw new TypeError('missing or invalid "uri" parameter');for (var i in this._uri = t, this._parameters = {}, this.display_name = n, r) {
        Object.prototype.hasOwnProperty.call(r, i) && this.setParam(i, r[i]);
      }
    }return i(e, null, [{ key: "parse", value: function value(e) {
        return -1 !== (e = s.parse(e, "Name_Addr_Header")) ? e : void 0;
      } }]), i(e, [{ key: "setParam", value: function value(e, t) {
        e && (this._parameters[e.toLowerCase()] = null == t ? null : t.toString());
      } }, { key: "getParam", value: function value(e) {
        if (e) return this._parameters[e.toLowerCase()];
      } }, { key: "hasParam", value: function value(e) {
        if (e) return !!this._parameters.hasOwnProperty(e.toLowerCase());
      } }, { key: "deleteParam", value: function value(e) {
        if (e = e.toLowerCase(), this._parameters.hasOwnProperty(e)) {
          var t = this._parameters[e];return delete this._parameters[e], t;
        }
      } }, { key: "clearParams", value: function value() {
        this._parameters = {};
      } }, { key: "clone", value: function value() {
        return new e(this._uri.clone(), this._display_name, JSON.parse(JSON.stringify(this._parameters)));
      } }, { key: "_quote", value: function value(e) {
        return e.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      } }, { key: "toString", value: function value() {
        var e = this._display_name ? '"'.concat(this._quote(this._display_name), '" ') : "";for (var t in e += "<".concat(this._uri.toString(), ">"), this._parameters) {
          Object.prototype.hasOwnProperty.call(this._parameters, t) && (e += ";".concat(t), null !== this._parameters[t] && (e += "=".concat(this._parameters[t])));
        }return e;
      } }, { key: "uri", get: function get() {
        return this._uri;
      } }, { key: "display_name", get: function get() {
        return this._display_name;
      }, set: function set(e) {
        this._display_name = 0 === e ? "0" : e;
      } }]), e;
  }();
}, function (e, t, n) {
  (function (r) {
    t.formatArgs = function (t) {
      if (t[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + t[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors) return;var n = "color: " + this.color;t.splice(1, 0, n, "color: inherit");var r = 0,
          i = 0;t[0].replace(/%[a-zA-Z%]/g, function (e) {
        "%%" !== e && (r++, "%c" === e && (i = r));
      }), t.splice(i, 0, n);
    }, t.save = function (e) {
      try {
        e ? t.storage.setItem("debug", e) : t.storage.removeItem("debug");
      } catch (e) {}
    }, t.load = function () {
      var e = void 0;try {
        e = t.storage.getItem("debug");
      } catch (e) {}return !e && void 0 !== r && "env" in r && (e = r.env.DEBUG), e;
    }, t.useColors = function () {
      return !("undefined" == typeof window || !window.process || "renderer" !== window.process.type && !window.process.__nwjs) || ("undefined" == typeof navigator || !navigator.userAgent || !navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) && ("undefined" != typeof document && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || "undefined" != typeof window && window.console && (window.console.firebug || window.console.exception && window.console.table) || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
    }, t.storage = function () {
      try {
        return localStorage;
      } catch (e) {}
    }(), t.destroy = function () {
      var e = !1;return function () {
        e || (e = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    }(), t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"], t.log = console.debug || console.log || function () {}, e.exports = n(31)(t);var i = e.exports.formatters;
    i.j = function (e) {
      try {
        return JSON.stringify(e);
      } catch (e) {
        return "[UnexpectedJSONParseError]: " + e.message;
      }
    };
  }).call(this, n(15));
}, function (e, t, n) {
  (function (e, r) {
    var i;
    /**
     * @license
     * Lodash <https://lodash.com/>
     * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     */(function () {
      var o = "Expected a function",
          s = "__lodash_placeholder__",
          a = [["ary", 128], ["bind", 1], ["bindKey", 2], ["curry", 8], ["curryRight", 16], ["flip", 512], ["partial", 32], ["partialRight", 64], ["rearg", 256]],
          l = "[object Arguments]",
          u = "[object Array]",
          c = "[object Boolean]",
          d = "[object Date]",
          h = "[object Error]",
          f = "[object Function]",
          p = "[object GeneratorFunction]",
          g = "[object Map]",
          _ = "[object Number]",
          m = "[object Object]",
          v = "[object RegExp]",
          y = "[object Set]",
          b = "[object String]",
          C = "[object Symbol]",
          T = "[object WeakMap]",
          w = "[object ArrayBuffer]",
          S = "[object DataView]",
          A = "[object Float32Array]",
          E = "[object Float64Array]",
          I = "[object Int8Array]",
          R = "[object Int16Array]",
          k = "[object Int32Array]",
          x = "[object Uint8Array]",
          M = "[object Uint16Array]",
          D = "[object Uint32Array]",
          O = /\b__p \+= '';/g,
          L = /\b(__p \+=) '' \+/g,
          P = /(__e\(.*?\)|\b__t\)) \+\n'';/g,
          N = /&(?:amp|lt|gt|quot|#39);/g,
          j = /[&<>"']/g,
          U = RegExp(N.source),
          F = RegExp(j.source),
          H = /<%-([\s\S]+?)%>/g,
          q = /<%([\s\S]+?)%>/g,
          z = /<%=([\s\S]+?)%>/g,
          G = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
          V = /^\w*$/,
          B = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
          W = /[\\^$.*+?()[\]{}|]/g,
          Y = RegExp(W.source),
          K = /^\s+|\s+$/g,
          J = /^\s+/,
          Q = /\s+$/,
          $ = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,
          Z = /\{\n\/\* \[wrapped with (.+)\] \*/,
          X = /,? & /,
          ee = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g,
          te = /\\(\\)?/g,
          ne = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,
          re = /\w*$/,
          ie = /^[-+]0x[0-9a-f]+$/i,
          oe = /^0b[01]+$/i,
          se = /^\[object .+?Constructor\]$/,
          ae = /^0o[0-7]+$/i,
          le = /^(?:0|[1-9]\d*)$/,
          ue = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g,
          ce = /($^)/,
          de = /['\n\r\u2028\u2029\\]/g,
          he = "\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff",
          fe = "\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2000-\\u206f \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000",
          pe = "[\\ud800-\\udfff]",
          ge = "[" + fe + "]",
          _e = "[" + he + "]",
          me = "\\d+",
          ve = "[\\u2700-\\u27bf]",
          ye = "[a-z\\xdf-\\xf6\\xf8-\\xff]",
          be = "[^\\ud800-\\udfff" + fe + me + "\\u2700-\\u27bfa-z\\xdf-\\xf6\\xf8-\\xffA-Z\\xc0-\\xd6\\xd8-\\xde]",
          Ce = "\\ud83c[\\udffb-\\udfff]",
          Te = "[^\\ud800-\\udfff]",
          we = "(?:\\ud83c[\\udde6-\\uddff]){2}",
          Se = "[\\ud800-\\udbff][\\udc00-\\udfff]",
          Ae = "[A-Z\\xc0-\\xd6\\xd8-\\xde]",
          Ee = "(?:" + ye + "|" + be + ")",
          Ie = "(?:" + Ae + "|" + be + ")",
          Re = "(?:" + _e + "|" + Ce + ")?",
          ke = "[\\ufe0e\\ufe0f]?" + Re + "(?:\\u200d(?:" + [Te, we, Se].join("|") + ")[\\ufe0e\\ufe0f]?" + Re + ")*",
          xe = "(?:" + [ve, we, Se].join("|") + ")" + ke,
          Me = "(?:" + [Te + _e + "?", _e, we, Se, pe].join("|") + ")",
          De = RegExp("['’]", "g"),
          Oe = RegExp(_e, "g"),
          Le = RegExp(Ce + "(?=" + Ce + ")|" + Me + ke, "g"),
          Pe = RegExp([Ae + "?" + ye + "+(?:['’](?:d|ll|m|re|s|t|ve))?(?=" + [ge, Ae, "$"].join("|") + ")", Ie + "+(?:['’](?:D|LL|M|RE|S|T|VE))?(?=" + [ge, Ae + Ee, "$"].join("|") + ")", Ae + "?" + Ee + "+(?:['’](?:d|ll|m|re|s|t|ve))?", Ae + "+(?:['’](?:D|LL|M|RE|S|T|VE))?", "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", me, xe].join("|"), "g"),
          Ne = RegExp("[\\u200d\\ud800-\\udfff" + he + "\\ufe0e\\ufe0f]"),
          je = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/,
          Ue = ["Array", "Buffer", "DataView", "Date", "Error", "Float32Array", "Float64Array", "Function", "Int8Array", "Int16Array", "Int32Array", "Map", "Math", "Object", "Promise", "RegExp", "Set", "String", "Symbol", "TypeError", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "WeakMap", "_", "clearTimeout", "isFinite", "parseInt", "setTimeout"],
          Fe = -1,
          He = {};He[A] = He[E] = He[I] = He[R] = He[k] = He[x] = He["[object Uint8ClampedArray]"] = He[M] = He[D] = !0, He[l] = He[u] = He[w] = He[c] = He[S] = He[d] = He[h] = He[f] = He[g] = He[_] = He[m] = He[v] = He[y] = He[b] = He[T] = !1;var qe = {};qe[l] = qe[u] = qe[w] = qe[S] = qe[c] = qe[d] = qe[A] = qe[E] = qe[I] = qe[R] = qe[k] = qe[g] = qe[_] = qe[m] = qe[v] = qe[y] = qe[b] = qe[C] = qe[x] = qe["[object Uint8ClampedArray]"] = qe[M] = qe[D] = !0, qe[h] = qe[f] = qe[T] = !1;var ze = { "\\": "\\", "'": "'", "\n": "n", "\r": "r", "\u2028": "u2028", "\u2029": "u2029" },
          Ge = parseFloat,
          Ve = parseInt,
          Be = "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e && e.Object === Object && e,
          We = "object" == (typeof self === "undefined" ? "undefined" : (0, _typeof3.default)(self)) && self && self.Object === Object && self,
          Ye = Be || We || Function("return this")(),
          Ke = t && !t.nodeType && t,
          Je = Ke && "object" == (typeof r === "undefined" ? "undefined" : (0, _typeof3.default)(r)) && r && !r.nodeType && r,
          Qe = Je && Je.exports === Ke,
          $e = Qe && Be.process,
          Ze = function () {
        try {
          var e = Je && Je.require && Je.require("util").types;return e || $e && $e.binding && $e.binding("util");
        } catch (e) {}
      }(),
          Xe = Ze && Ze.isArrayBuffer,
          et = Ze && Ze.isDate,
          tt = Ze && Ze.isMap,
          nt = Ze && Ze.isRegExp,
          rt = Ze && Ze.isSet,
          it = Ze && Ze.isTypedArray;function ot(e, t, n) {
        switch (n.length) {case 0:
            return e.call(t);case 1:
            return e.call(t, n[0]);case 2:
            return e.call(t, n[0], n[1]);case 3:
            return e.call(t, n[0], n[1], n[2]);}return e.apply(t, n);
      }function st(e, t, n, r) {
        for (var i = -1, o = null == e ? 0 : e.length; ++i < o;) {
          var s = e[i];t(r, s, n(s), e);
        }return r;
      }function at(e, t) {
        for (var n = -1, r = null == e ? 0 : e.length; ++n < r && !1 !== t(e[n], n, e);) {}return e;
      }function lt(e, t) {
        for (var n = null == e ? 0 : e.length; n-- && !1 !== t(e[n], n, e);) {}return e;
      }function ut(e, t) {
        for (var n = -1, r = null == e ? 0 : e.length; ++n < r;) {
          if (!t(e[n], n, e)) return !1;
        }return !0;
      }function ct(e, t) {
        for (var n = -1, r = null == e ? 0 : e.length, i = 0, o = []; ++n < r;) {
          var s = e[n];t(s, n, e) && (o[i++] = s);
        }return o;
      }function dt(e, t) {
        return !(null == e || !e.length) && Ct(e, t, 0) > -1;
      }function ht(e, t, n) {
        for (var r = -1, i = null == e ? 0 : e.length; ++r < i;) {
          if (n(t, e[r])) return !0;
        }return !1;
      }function ft(e, t) {
        for (var n = -1, r = null == e ? 0 : e.length, i = Array(r); ++n < r;) {
          i[n] = t(e[n], n, e);
        }return i;
      }function pt(e, t) {
        for (var n = -1, r = t.length, i = e.length; ++n < r;) {
          e[i + n] = t[n];
        }return e;
      }function gt(e, t, n, r) {
        var i = -1,
            o = null == e ? 0 : e.length;for (r && o && (n = e[++i]); ++i < o;) {
          n = t(n, e[i], i, e);
        }return n;
      }function _t(e, t, n, r) {
        var i = null == e ? 0 : e.length;for (r && i && (n = e[--i]); i--;) {
          n = t(n, e[i], i, e);
        }return n;
      }function mt(e, t) {
        for (var n = -1, r = null == e ? 0 : e.length; ++n < r;) {
          if (t(e[n], n, e)) return !0;
        }return !1;
      }var vt = At("length");function yt(e, t, n) {
        var r;return n(e, function (e, n, i) {
          if (t(e, n, i)) return r = n, !1;
        }), r;
      }function bt(e, t, n, r) {
        for (var i = e.length, o = n + (r ? 1 : -1); r ? o-- : ++o < i;) {
          if (t(e[o], o, e)) return o;
        }return -1;
      }function Ct(e, t, n) {
        return t == t ? function (e, t, n) {
          for (var r = n - 1, i = e.length; ++r < i;) {
            if (e[r] === t) return r;
          }return -1;
        }(e, t, n) : bt(e, wt, n);
      }function Tt(e, t, n, r) {
        for (var i = n - 1, o = e.length; ++i < o;) {
          if (r(e[i], t)) return i;
        }return -1;
      }function wt(e) {
        return e != e;
      }function St(e, t) {
        var n = null == e ? 0 : e.length;return n ? Rt(e, t) / n : NaN;
      }function At(e) {
        return function (t) {
          return null == t ? void 0 : t[e];
        };
      }function Et(e) {
        return function (t) {
          return null == e ? void 0 : e[t];
        };
      }function It(e, t, n, r, i) {
        return i(e, function (e, i, o) {
          n = r ? (r = !1, e) : t(n, e, i, o);
        }), n;
      }function Rt(e, t) {
        for (var n, r = -1, i = e.length; ++r < i;) {
          var o = t(e[r]);void 0 !== o && (n = void 0 === n ? o : n + o);
        }return n;
      }function kt(e, t) {
        for (var n = -1, r = Array(e); ++n < e;) {
          r[n] = t(n);
        }return r;
      }function xt(e) {
        return function (t) {
          return e(t);
        };
      }function Mt(e, t) {
        return ft(t, function (t) {
          return e[t];
        });
      }function Dt(e, t) {
        return e.has(t);
      }function Ot(e, t) {
        for (var n = -1, r = e.length; ++n < r && Ct(t, e[n], 0) > -1;) {}return n;
      }function Lt(e, t) {
        for (var n = e.length; n-- && Ct(t, e[n], 0) > -1;) {}return n;
      }function Pt(e, t) {
        for (var n = e.length, r = 0; n--;) {
          e[n] === t && ++r;
        }return r;
      }var Nt = Et({ "À": "A", "Á": "A", "Â": "A", "Ã": "A", "Ä": "A", "Å": "A", "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "Ç": "C", "ç": "c", "Ð": "D", "ð": "d", "È": "E", "É": "E", "Ê": "E", "Ë": "E", "è": "e", "é": "e", "ê": "e", "ë": "e", "Ì": "I", "Í": "I", "Î": "I", "Ï": "I", "ì": "i", "í": "i", "î": "i", "ï": "i", "Ñ": "N", "ñ": "n", "Ò": "O", "Ó": "O", "Ô": "O", "Õ": "O", "Ö": "O", "Ø": "O", "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o", "ø": "o", "Ù": "U", "Ú": "U", "Û": "U", "Ü": "U", "ù": "u", "ú": "u", "û": "u", "ü": "u", "Ý": "Y", "ý": "y", "ÿ": "y", "Æ": "Ae", "æ": "ae", "Þ": "Th", "þ": "th", "ß": "ss", "Ā": "A", "Ă": "A", "Ą": "A", "ā": "a", "ă": "a", "ą": "a", "Ć": "C", "Ĉ": "C", "Ċ": "C", "Č": "C", "ć": "c", "ĉ": "c", "ċ": "c", "č": "c", "Ď": "D", "Đ": "D", "ď": "d", "đ": "d", "Ē": "E", "Ĕ": "E", "Ė": "E", "Ę": "E", "Ě": "E", "ē": "e", "ĕ": "e", "ė": "e", "ę": "e", "ě": "e", "Ĝ": "G", "Ğ": "G", "Ġ": "G", "Ģ": "G", "ĝ": "g", "ğ": "g", "ġ": "g", "ģ": "g", "Ĥ": "H", "Ħ": "H", "ĥ": "h", "ħ": "h", "Ĩ": "I", "Ī": "I", "Ĭ": "I", "Į": "I", "İ": "I", "ĩ": "i", "ī": "i", "ĭ": "i", "į": "i", "ı": "i", "Ĵ": "J", "ĵ": "j", "Ķ": "K", "ķ": "k", "ĸ": "k", "Ĺ": "L", "Ļ": "L", "Ľ": "L", "Ŀ": "L", "Ł": "L", "ĺ": "l", "ļ": "l", "ľ": "l", "ŀ": "l", "ł": "l", "Ń": "N", "Ņ": "N", "Ň": "N", "Ŋ": "N", "ń": "n", "ņ": "n", "ň": "n", "ŋ": "n", "Ō": "O", "Ŏ": "O", "Ő": "O", "ō": "o", "ŏ": "o", "ő": "o", "Ŕ": "R", "Ŗ": "R", "Ř": "R", "ŕ": "r", "ŗ": "r", "ř": "r", "Ś": "S", "Ŝ": "S", "Ş": "S", "Š": "S", "ś": "s", "ŝ": "s", "ş": "s", "š": "s", "Ţ": "T", "Ť": "T", "Ŧ": "T", "ţ": "t", "ť": "t", "ŧ": "t", "Ũ": "U", "Ū": "U", "Ŭ": "U", "Ů": "U", "Ű": "U", "Ų": "U", "ũ": "u", "ū": "u", "ŭ": "u", "ů": "u", "ű": "u", "ų": "u", "Ŵ": "W", "ŵ": "w", "Ŷ": "Y", "ŷ": "y", "Ÿ": "Y", "Ź": "Z", "Ż": "Z", "Ž": "Z", "ź": "z", "ż": "z", "ž": "z", "Ĳ": "IJ", "ĳ": "ij", "Œ": "Oe", "œ": "oe", "ŉ": "'n", "ſ": "s" }),
          jt = Et({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });function Ut(e) {
        return "\\" + ze[e];
      }function Ft(e) {
        return Ne.test(e);
      }function Ht(e) {
        var t = -1,
            n = Array(e.size);return e.forEach(function (e, r) {
          n[++t] = [r, e];
        }), n;
      }function qt(e, t) {
        return function (n) {
          return e(t(n));
        };
      }function zt(e, t) {
        for (var n = -1, r = e.length, i = 0, o = []; ++n < r;) {
          var a = e[n];a !== t && a !== s || (e[n] = s, o[i++] = n);
        }return o;
      }function Gt(e) {
        var t = -1,
            n = Array(e.size);return e.forEach(function (e) {
          n[++t] = e;
        }), n;
      }function Vt(e) {
        var t = -1,
            n = Array(e.size);return e.forEach(function (e) {
          n[++t] = [e, e];
        }), n;
      }function Bt(e) {
        return Ft(e) ? function (e) {
          for (var t = Le.lastIndex = 0; Le.test(e);) {
            ++t;
          }return t;
        }(e) : vt(e);
      }function Wt(e) {
        return Ft(e) ? function (e) {
          return e.match(Le) || [];
        }(e) : function (e) {
          return e.split("");
        }(e);
      }var Yt = Et({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }),
          Kt = function e(t) {
        var n,
            r = (t = null == t ? Ye : Kt.defaults(Ye.Object(), t, Kt.pick(Ye, Ue))).Array,
            i = t.Date,
            he = t.Error,
            fe = t.Function,
            pe = t.Math,
            ge = t.Object,
            _e = t.RegExp,
            me = t.String,
            ve = t.TypeError,
            ye = r.prototype,
            be = fe.prototype,
            Ce = ge.prototype,
            Te = t["__core-js_shared__"],
            we = be.toString,
            Se = Ce.hasOwnProperty,
            Ae = 0,
            Ee = (n = /[^.]+$/.exec(Te && Te.keys && Te.keys.IE_PROTO || "")) ? "Symbol(src)_1." + n : "",
            Ie = Ce.toString,
            Re = we.call(ge),
            ke = Ye._,
            xe = _e("^" + we.call(Se).replace(W, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"),
            Me = Qe ? t.Buffer : void 0,
            Le = t.Symbol,
            Ne = t.Uint8Array,
            ze = Me ? Me.allocUnsafe : void 0,
            Be = qt(ge.getPrototypeOf, ge),
            We = ge.create,
            Ke = Ce.propertyIsEnumerable,
            Je = ye.splice,
            $e = Le ? Le.isConcatSpreadable : void 0,
            Ze = Le ? Le.iterator : void 0,
            vt = Le ? Le.toStringTag : void 0,
            Et = function () {
          try {
            var e = Xi(ge, "defineProperty");return e({}, "", {}), e;
          } catch (e) {}
        }(),
            Jt = t.clearTimeout !== Ye.clearTimeout && t.clearTimeout,
            Qt = i && i.now !== Ye.Date.now && i.now,
            $t = t.setTimeout !== Ye.setTimeout && t.setTimeout,
            Zt = pe.ceil,
            Xt = pe.floor,
            en = ge.getOwnPropertySymbols,
            tn = Me ? Me.isBuffer : void 0,
            nn = t.isFinite,
            rn = ye.join,
            on = qt(ge.keys, ge),
            sn = pe.max,
            an = pe.min,
            ln = i.now,
            un = t.parseInt,
            cn = pe.random,
            dn = ye.reverse,
            hn = Xi(t, "DataView"),
            fn = Xi(t, "Map"),
            pn = Xi(t, "Promise"),
            gn = Xi(t, "Set"),
            _n = Xi(t, "WeakMap"),
            mn = Xi(ge, "create"),
            vn = _n && new _n(),
            yn = {},
            bn = Io(hn),
            Cn = Io(fn),
            Tn = Io(pn),
            wn = Io(gn),
            Sn = Io(_n),
            An = Le ? Le.prototype : void 0,
            En = An ? An.valueOf : void 0,
            In = An ? An.toString : void 0;function Rn(e) {
          if (Vs(e) && !Os(e) && !(e instanceof Dn)) {
            if (e instanceof Mn) return e;if (Se.call(e, "__wrapped__")) return Ro(e);
          }return new Mn(e);
        }var kn = function () {
          function e() {}return function (t) {
            if (!Gs(t)) return {};if (We) return We(t);e.prototype = t;var n = new e();return e.prototype = void 0, n;
          };
        }();function xn() {}function Mn(e, t) {
          this.__wrapped__ = e, this.__actions__ = [], this.__chain__ = !!t, this.__index__ = 0, this.__values__ = void 0;
        }function Dn(e) {
          this.__wrapped__ = e, this.__actions__ = [], this.__dir__ = 1, this.__filtered__ = !1, this.__iteratees__ = [], this.__takeCount__ = 4294967295, this.__views__ = [];
        }function On(e) {
          var t = -1,
              n = null == e ? 0 : e.length;for (this.clear(); ++t < n;) {
            var r = e[t];this.set(r[0], r[1]);
          }
        }function Ln(e) {
          var t = -1,
              n = null == e ? 0 : e.length;for (this.clear(); ++t < n;) {
            var r = e[t];this.set(r[0], r[1]);
          }
        }function Pn(e) {
          var t = -1,
              n = null == e ? 0 : e.length;for (this.clear(); ++t < n;) {
            var r = e[t];this.set(r[0], r[1]);
          }
        }function Nn(e) {
          var t = -1,
              n = null == e ? 0 : e.length;for (this.__data__ = new Pn(); ++t < n;) {
            this.add(e[t]);
          }
        }function jn(e) {
          var t = this.__data__ = new Ln(e);this.size = t.size;
        }function Un(e, t) {
          var n = Os(e),
              r = !n && Ds(e),
              i = !n && !r && js(e),
              o = !n && !r && !i && Zs(e),
              s = n || r || i || o,
              a = s ? kt(e.length, me) : [],
              l = a.length;for (var u in e) {
            !t && !Se.call(e, u) || s && ("length" == u || i && ("offset" == u || "parent" == u) || o && ("buffer" == u || "byteLength" == u || "byteOffset" == u) || so(u, l)) || a.push(u);
          }return a;
        }function Fn(e) {
          var t = e.length;return t ? e[Nr(0, t - 1)] : void 0;
        }function Hn(e, t) {
          return So(mi(e), Jn(t, 0, e.length));
        }function qn(e) {
          return So(mi(e));
        }function zn(e, t, n) {
          (void 0 !== n && !ks(e[t], n) || void 0 === n && !(t in e)) && Yn(e, t, n);
        }function Gn(e, t, n) {
          var r = e[t];Se.call(e, t) && ks(r, n) && (void 0 !== n || t in e) || Yn(e, t, n);
        }function Vn(e, t) {
          for (var n = e.length; n--;) {
            if (ks(e[n][0], t)) return n;
          }return -1;
        }function Bn(e, t, n, r) {
          return er(e, function (e, i, o) {
            t(r, e, n(e), o);
          }), r;
        }function Wn(e, t) {
          return e && vi(t, ba(t), e);
        }function Yn(e, t, n) {
          "__proto__" == t && Et ? Et(e, t, { configurable: !0, enumerable: !0, value: n, writable: !0 }) : e[t] = n;
        }function Kn(e, t) {
          for (var n = -1, i = t.length, o = r(i), s = null == e; ++n < i;) {
            o[n] = s ? void 0 : ga(e, t[n]);
          }return o;
        }function Jn(e, t, n) {
          return e == e && (void 0 !== n && (e = e <= n ? e : n), void 0 !== t && (e = e >= t ? e : t)), e;
        }function Qn(e, t, n, r, i, o) {
          var s,
              a = 1 & t,
              u = 2 & t,
              h = 4 & t;if (n && (s = i ? n(e, r, i, o) : n(e)), void 0 !== s) return s;if (!Gs(e)) return e;var T = Os(e);if (T) {
            if (s = function (e) {
              var t = e.length,
                  n = new e.constructor(t);return t && "string" == typeof e[0] && Se.call(e, "index") && (n.index = e.index, n.input = e.input), n;
            }(e), !a) return mi(e, s);
          } else {
            var O = no(e),
                L = O == f || O == p;if (js(e)) return di(e, a);if (O == m || O == l || L && !i) {
              if (s = u || L ? {} : io(e), !a) return u ? function (e, t) {
                return vi(e, to(e), t);
              }(e, function (e, t) {
                return e && vi(t, Ca(t), e);
              }(s, e)) : function (e, t) {
                return vi(e, eo(e), t);
              }(e, Wn(s, e));
            } else {
              if (!qe[O]) return i ? e : {};s = function (e, t, n) {
                var r,
                    i = e.constructor;switch (t) {case w:
                    return hi(e);case c:case d:
                    return new i(+e);case S:
                    return function (e, t) {
                      var n = t ? hi(e.buffer) : e.buffer;return new e.constructor(n, e.byteOffset, e.byteLength);
                    }(e, n);case A:case E:case I:case R:case k:case x:case "[object Uint8ClampedArray]":case M:case D:
                    return fi(e, n);case g:
                    return new i();case _:case b:
                    return new i(e);case v:
                    return function (e) {
                      var t = new e.constructor(e.source, re.exec(e));return t.lastIndex = e.lastIndex, t;
                    }(e);case y:
                    return new i();case C:
                    return r = e, En ? ge(En.call(r)) : {};}
              }(e, O, a);
            }
          }o || (o = new jn());var P = o.get(e);if (P) return P;o.set(e, s), Js(e) ? e.forEach(function (r) {
            s.add(Qn(r, t, n, r, e, o));
          }) : Bs(e) && e.forEach(function (r, i) {
            s.set(i, Qn(r, t, n, i, e, o));
          });var N = T ? void 0 : (h ? u ? Wi : Bi : u ? Ca : ba)(e);return at(N || e, function (r, i) {
            N && (r = e[i = r]), Gn(s, i, Qn(r, t, n, i, e, o));
          }), s;
        }function $n(e, t, n) {
          var r = n.length;if (null == e) return !r;for (e = ge(e); r--;) {
            var i = n[r],
                o = t[i],
                s = e[i];if (void 0 === s && !(i in e) || !o(s)) return !1;
          }return !0;
        }function Zn(e, t, n) {
          if ("function" != typeof e) throw new ve(o);return bo(function () {
            e.apply(void 0, n);
          }, t);
        }function Xn(e, t, n, r) {
          var i = -1,
              o = dt,
              s = !0,
              a = e.length,
              l = [],
              u = t.length;if (!a) return l;n && (t = ft(t, xt(n))), r ? (o = ht, s = !1) : t.length >= 200 && (o = Dt, s = !1, t = new Nn(t));e: for (; ++i < a;) {
            var c = e[i],
                d = null == n ? c : n(c);if (c = r || 0 !== c ? c : 0, s && d == d) {
              for (var h = u; h--;) {
                if (t[h] === d) continue e;
              }l.push(c);
            } else o(t, d, r) || l.push(c);
          }return l;
        }Rn.templateSettings = { escape: H, evaluate: q, interpolate: z, variable: "", imports: { _: Rn } }, Rn.prototype = xn.prototype, Rn.prototype.constructor = Rn, Mn.prototype = kn(xn.prototype), Mn.prototype.constructor = Mn, Dn.prototype = kn(xn.prototype), Dn.prototype.constructor = Dn, On.prototype.clear = function () {
          this.__data__ = mn ? mn(null) : {}, this.size = 0;
        }, On.prototype.delete = function (e) {
          var t = this.has(e) && delete this.__data__[e];return this.size -= t ? 1 : 0, t;
        }, On.prototype.get = function (e) {
          var t = this.__data__;if (mn) {
            var n = t[e];return "__lodash_hash_undefined__" === n ? void 0 : n;
          }return Se.call(t, e) ? t[e] : void 0;
        }, On.prototype.has = function (e) {
          var t = this.__data__;return mn ? void 0 !== t[e] : Se.call(t, e);
        }, On.prototype.set = function (e, t) {
          var n = this.__data__;return this.size += this.has(e) ? 0 : 1, n[e] = mn && void 0 === t ? "__lodash_hash_undefined__" : t, this;
        }, Ln.prototype.clear = function () {
          this.__data__ = [], this.size = 0;
        }, Ln.prototype.delete = function (e) {
          var t = this.__data__,
              n = Vn(t, e);return !(n < 0) && (n == t.length - 1 ? t.pop() : Je.call(t, n, 1), --this.size, !0);
        }, Ln.prototype.get = function (e) {
          var t = this.__data__,
              n = Vn(t, e);return n < 0 ? void 0 : t[n][1];
        }, Ln.prototype.has = function (e) {
          return Vn(this.__data__, e) > -1;
        }, Ln.prototype.set = function (e, t) {
          var n = this.__data__,
              r = Vn(n, e);return r < 0 ? (++this.size, n.push([e, t])) : n[r][1] = t, this;
        }, Pn.prototype.clear = function () {
          this.size = 0, this.__data__ = { hash: new On(), map: new (fn || Ln)(), string: new On() };
        }, Pn.prototype.delete = function (e) {
          var t = $i(this, e).delete(e);return this.size -= t ? 1 : 0, t;
        }, Pn.prototype.get = function (e) {
          return $i(this, e).get(e);
        }, Pn.prototype.has = function (e) {
          return $i(this, e).has(e);
        }, Pn.prototype.set = function (e, t) {
          var n = $i(this, e),
              r = n.size;return n.set(e, t), this.size += n.size == r ? 0 : 1, this;
        }, Nn.prototype.add = Nn.prototype.push = function (e) {
          return this.__data__.set(e, "__lodash_hash_undefined__"), this;
        }, Nn.prototype.has = function (e) {
          return this.__data__.has(e);
        }, jn.prototype.clear = function () {
          this.__data__ = new Ln(), this.size = 0;
        }, jn.prototype.delete = function (e) {
          var t = this.__data__,
              n = t.delete(e);return this.size = t.size, n;
        }, jn.prototype.get = function (e) {
          return this.__data__.get(e);
        }, jn.prototype.has = function (e) {
          return this.__data__.has(e);
        }, jn.prototype.set = function (e, t) {
          var n = this.__data__;if (n instanceof Ln) {
            var r = n.__data__;if (!fn || r.length < 199) return r.push([e, t]), this.size = ++n.size, this;n = this.__data__ = new Pn(r);
          }return n.set(e, t), this.size = n.size, this;
        };var er = Ci(lr),
            tr = Ci(ur, !0);function nr(e, t) {
          var n = !0;return er(e, function (e, r, i) {
            return n = !!t(e, r, i);
          }), n;
        }function rr(e, t, n) {
          for (var r = -1, i = e.length; ++r < i;) {
            var o = e[r],
                s = t(o);if (null != s && (void 0 === a ? s == s && !$s(s) : n(s, a))) var a = s,
                l = o;
          }return l;
        }function ir(e, t) {
          var n = [];return er(e, function (e, r, i) {
            t(e, r, i) && n.push(e);
          }), n;
        }function or(e, t, n, r, i) {
          var o = -1,
              s = e.length;for (n || (n = oo), i || (i = []); ++o < s;) {
            var a = e[o];t > 0 && n(a) ? t > 1 ? or(a, t - 1, n, r, i) : pt(i, a) : r || (i[i.length] = a);
          }return i;
        }var sr = Ti(),
            ar = Ti(!0);function lr(e, t) {
          return e && sr(e, t, ba);
        }function ur(e, t) {
          return e && ar(e, t, ba);
        }function cr(e, t) {
          return ct(t, function (t) {
            return Hs(e[t]);
          });
        }function dr(e, t) {
          for (var n = 0, r = (t = ai(t, e)).length; null != e && n < r;) {
            e = e[Eo(t[n++])];
          }return n && n == r ? e : void 0;
        }function hr(e, t, n) {
          var r = t(e);return Os(e) ? r : pt(r, n(e));
        }function fr(e) {
          return null == e ? void 0 === e ? "[object Undefined]" : "[object Null]" : vt && vt in ge(e) ? function (e) {
            var t = Se.call(e, vt),
                n = e[vt];try {
              e[vt] = void 0;var r = !0;
            } catch (e) {}var i = Ie.call(e);return r && (t ? e[vt] = n : delete e[vt]), i;
          }(e) : function (e) {
            return Ie.call(e);
          }(e);
        }function pr(e, t) {
          return e > t;
        }function gr(e, t) {
          return null != e && Se.call(e, t);
        }function _r(e, t) {
          return null != e && t in ge(e);
        }function mr(e, t, n) {
          for (var i = n ? ht : dt, o = e[0].length, s = e.length, a = s, l = r(s), u = 1 / 0, c = []; a--;) {
            var d = e[a];a && t && (d = ft(d, xt(t))), u = an(d.length, u), l[a] = !n && (t || o >= 120 && d.length >= 120) ? new Nn(a && d) : void 0;
          }d = e[0];var h = -1,
              f = l[0];e: for (; ++h < o && c.length < u;) {
            var p = d[h],
                g = t ? t(p) : p;if (p = n || 0 !== p ? p : 0, !(f ? Dt(f, g) : i(c, g, n))) {
              for (a = s; --a;) {
                var _ = l[a];if (!(_ ? Dt(_, g) : i(e[a], g, n))) continue e;
              }f && f.push(g), c.push(p);
            }
          }return c;
        }function vr(e, t, n) {
          var r = null == (e = _o(e, t = ai(t, e))) ? e : e[Eo(Fo(t))];return null == r ? void 0 : ot(r, e, n);
        }function yr(e) {
          return Vs(e) && fr(e) == l;
        }function br(e, t, n, r, i) {
          return e === t || (null == e || null == t || !Vs(e) && !Vs(t) ? e != e && t != t : function (e, t, n, r, i, o) {
            var s = Os(e),
                a = Os(t),
                f = s ? u : no(e),
                p = a ? u : no(t),
                T = (f = f == l ? m : f) == m,
                A = (p = p == l ? m : p) == m,
                E = f == p;if (E && js(e)) {
              if (!js(t)) return !1;s = !0, T = !1;
            }if (E && !T) return o || (o = new jn()), s || Zs(e) ? Gi(e, t, n, r, i, o) : function (e, t, n, r, i, o, s) {
              switch (n) {case S:
                  if (e.byteLength != t.byteLength || e.byteOffset != t.byteOffset) return !1;e = e.buffer, t = t.buffer;case w:
                  return !(e.byteLength != t.byteLength || !o(new Ne(e), new Ne(t)));case c:case d:case _:
                  return ks(+e, +t);case h:
                  return e.name == t.name && e.message == t.message;case v:case b:
                  return e == t + "";case g:
                  var a = Ht;case y:
                  var l = 1 & r;if (a || (a = Gt), e.size != t.size && !l) return !1;var u = s.get(e);if (u) return u == t;r |= 2, s.set(e, t);var f = Gi(a(e), a(t), r, i, o, s);return s.delete(e), f;case C:
                  if (En) return En.call(e) == En.call(t);}return !1;
            }(e, t, f, n, r, i, o);if (!(1 & n)) {
              var I = T && Se.call(e, "__wrapped__"),
                  R = A && Se.call(t, "__wrapped__");if (I || R) {
                var k = I ? e.value() : e,
                    x = R ? t.value() : t;return o || (o = new jn()), i(k, x, n, r, o);
              }
            }return !!E && (o || (o = new jn()), function (e, t, n, r, i, o) {
              var s = 1 & n,
                  a = Bi(e),
                  l = a.length,
                  u = Bi(t).length;if (l != u && !s) return !1;for (var c = l; c--;) {
                var d = a[c];if (!(s ? d in t : Se.call(t, d))) return !1;
              }var h = o.get(e);if (h && o.get(t)) return h == t;var f = !0;o.set(e, t), o.set(t, e);for (var p = s; ++c < l;) {
                d = a[c];var g = e[d],
                    _ = t[d];if (r) var m = s ? r(_, g, d, t, e, o) : r(g, _, d, e, t, o);if (!(void 0 === m ? g === _ || i(g, _, n, r, o) : m)) {
                  f = !1;break;
                }p || (p = "constructor" == d);
              }if (f && !p) {
                var v = e.constructor,
                    y = t.constructor;v == y || !("constructor" in e) || !("constructor" in t) || "function" == typeof v && v instanceof v && "function" == typeof y && y instanceof y || (f = !1);
              }return o.delete(e), o.delete(t), f;
            }(e, t, n, r, i, o));
          }(e, t, n, r, br, i));
        }function Cr(e, t, n, r) {
          var i = n.length,
              o = i,
              s = !r;if (null == e) return !o;for (e = ge(e); i--;) {
            var a = n[i];if (s && a[2] ? a[1] !== e[a[0]] : !(a[0] in e)) return !1;
          }for (; ++i < o;) {
            var l = (a = n[i])[0],
                u = e[l],
                c = a[1];if (s && a[2]) {
              if (void 0 === u && !(l in e)) return !1;
            } else {
              var d = new jn();if (r) var h = r(u, c, l, e, t, d);if (!(void 0 === h ? br(c, u, 3, r, d) : h)) return !1;
            }
          }return !0;
        }function Tr(e) {
          return !(!Gs(e) || (t = e, Ee && Ee in t)) && (Hs(e) ? xe : se).test(Io(e));var t;
        }function wr(e) {
          return "function" == typeof e ? e : null == e ? Wa : "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) ? Os(e) ? kr(e[0], e[1]) : Rr(e) : tl(e);
        }function Sr(e) {
          if (!ho(e)) return on(e);var t = [];for (var n in ge(e)) {
            Se.call(e, n) && "constructor" != n && t.push(n);
          }return t;
        }function Ar(e) {
          if (!Gs(e)) return function (e) {
            var t = [];if (null != e) for (var n in ge(e)) {
              t.push(n);
            }return t;
          }(e);var t = ho(e),
              n = [];for (var r in e) {
            ("constructor" != r || !t && Se.call(e, r)) && n.push(r);
          }return n;
        }function Er(e, t) {
          return e < t;
        }function Ir(e, t) {
          var n = -1,
              i = Ps(e) ? r(e.length) : [];return er(e, function (e, r, o) {
            i[++n] = t(e, r, o);
          }), i;
        }function Rr(e) {
          var t = Zi(e);return 1 == t.length && t[0][2] ? po(t[0][0], t[0][1]) : function (n) {
            return n === e || Cr(n, e, t);
          };
        }function kr(e, t) {
          return lo(e) && fo(t) ? po(Eo(e), t) : function (n) {
            var r = ga(n, e);return void 0 === r && r === t ? _a(n, e) : br(t, r, 3);
          };
        }function xr(e, t, n, r, i) {
          e !== t && sr(t, function (o, s) {
            if (i || (i = new jn()), Gs(o)) !function (e, t, n, r, i, o, s) {
              var a = vo(e, n),
                  l = vo(t, n),
                  u = s.get(l);if (u) zn(e, n, u);else {
                var c = o ? o(a, l, n + "", e, t, s) : void 0,
                    d = void 0 === c;if (d) {
                  var h = Os(l),
                      f = !h && js(l),
                      p = !h && !f && Zs(l);c = l, h || f || p ? Os(a) ? c = a : Ns(a) ? c = mi(a) : f ? (d = !1, c = di(l, !0)) : p ? (d = !1, c = fi(l, !0)) : c = [] : Ys(l) || Ds(l) ? (c = a, Ds(a) ? c = sa(a) : Gs(a) && !Hs(a) || (c = io(l))) : d = !1;
                }d && (s.set(l, c), i(c, l, r, o, s), s.delete(l)), zn(e, n, c);
              }
            }(e, t, s, n, xr, r, i);else {
              var a = r ? r(vo(e, s), o, s + "", e, t, i) : void 0;void 0 === a && (a = o), zn(e, s, a);
            }
          }, Ca);
        }function Mr(e, t) {
          var n = e.length;if (n) return so(t += t < 0 ? n : 0, n) ? e[t] : void 0;
        }function Dr(e, t, n) {
          var r = -1;return t = ft(t.length ? t : [Wa], xt(Qi())), function (e, t) {
            var n = e.length;for (e.sort(t); n--;) {
              e[n] = e[n].value;
            }return e;
          }(Ir(e, function (e, n, i) {
            return { criteria: ft(t, function (t) {
                return t(e);
              }), index: ++r, value: e };
          }), function (e, t) {
            return function (e, t, n) {
              for (var r = -1, i = e.criteria, o = t.criteria, s = i.length, a = n.length; ++r < s;) {
                var l = pi(i[r], o[r]);if (l) {
                  if (r >= a) return l;var u = n[r];return l * ("desc" == u ? -1 : 1);
                }
              }return e.index - t.index;
            }(e, t, n);
          });
        }function Or(e, t, n) {
          for (var r = -1, i = t.length, o = {}; ++r < i;) {
            var s = t[r],
                a = dr(e, s);n(a, s) && qr(o, ai(s, e), a);
          }return o;
        }function Lr(e, t, n, r) {
          var i = r ? Tt : Ct,
              o = -1,
              s = t.length,
              a = e;for (e === t && (t = mi(t)), n && (a = ft(e, xt(n))); ++o < s;) {
            for (var l = 0, u = t[o], c = n ? n(u) : u; (l = i(a, c, l, r)) > -1;) {
              a !== e && Je.call(a, l, 1), Je.call(e, l, 1);
            }
          }return e;
        }function Pr(e, t) {
          for (var n = e ? t.length : 0, r = n - 1; n--;) {
            var i = t[n];if (n == r || i !== o) {
              var o = i;so(i) ? Je.call(e, i, 1) : Xr(e, i);
            }
          }return e;
        }function Nr(e, t) {
          return e + Xt(cn() * (t - e + 1));
        }function jr(e, t) {
          var n = "";if (!e || t < 1 || t > 9007199254740991) return n;do {
            t % 2 && (n += e), (t = Xt(t / 2)) && (e += e);
          } while (t);return n;
        }function Ur(e, t) {
          return Co(go(e, t, Wa), e + "");
        }function Fr(e) {
          return Fn(ka(e));
        }function Hr(e, t) {
          var n = ka(e);return So(n, Jn(t, 0, n.length));
        }function qr(e, t, n, r) {
          if (!Gs(e)) return e;for (var i = -1, o = (t = ai(t, e)).length, s = o - 1, a = e; null != a && ++i < o;) {
            var l = Eo(t[i]),
                u = n;if (i != s) {
              var c = a[l];void 0 === (u = r ? r(c, l, a) : void 0) && (u = Gs(c) ? c : so(t[i + 1]) ? [] : {});
            }Gn(a, l, u), a = a[l];
          }return e;
        }var zr = vn ? function (e, t) {
          return vn.set(e, t), e;
        } : Wa,
            Gr = Et ? function (e, t) {
          return Et(e, "toString", { configurable: !0, enumerable: !1, value: Ga(t), writable: !0 });
        } : Wa;function Vr(e) {
          return So(ka(e));
        }function Br(e, t, n) {
          var i = -1,
              o = e.length;t < 0 && (t = -t > o ? 0 : o + t), (n = n > o ? o : n) < 0 && (n += o), o = t > n ? 0 : n - t >>> 0, t >>>= 0;for (var s = r(o); ++i < o;) {
            s[i] = e[i + t];
          }return s;
        }function Wr(e, t) {
          var n;return er(e, function (e, r, i) {
            return !(n = t(e, r, i));
          }), !!n;
        }function Yr(e, t, n) {
          var r = 0,
              i = null == e ? r : e.length;if ("number" == typeof t && t == t && i <= 2147483647) {
            for (; r < i;) {
              var o = r + i >>> 1,
                  s = e[o];null !== s && !$s(s) && (n ? s <= t : s < t) ? r = o + 1 : i = o;
            }return i;
          }return Kr(e, t, Wa, n);
        }function Kr(e, t, n, r) {
          t = n(t);for (var i = 0, o = null == e ? 0 : e.length, s = t != t, a = null === t, l = $s(t), u = void 0 === t; i < o;) {
            var c = Xt((i + o) / 2),
                d = n(e[c]),
                h = void 0 !== d,
                f = null === d,
                p = d == d,
                g = $s(d);if (s) var _ = r || p;else _ = u ? p && (r || h) : a ? p && h && (r || !f) : l ? p && h && !f && (r || !g) : !f && !g && (r ? d <= t : d < t);_ ? i = c + 1 : o = c;
          }return an(o, 4294967294);
        }function Jr(e, t) {
          for (var n = -1, r = e.length, i = 0, o = []; ++n < r;) {
            var s = e[n],
                a = t ? t(s) : s;if (!n || !ks(a, l)) {
              var l = a;o[i++] = 0 === s ? 0 : s;
            }
          }return o;
        }function Qr(e) {
          return "number" == typeof e ? e : $s(e) ? NaN : +e;
        }function $r(e) {
          if ("string" == typeof e) return e;if (Os(e)) return ft(e, $r) + "";if ($s(e)) return In ? In.call(e) : "";var t = e + "";return "0" == t && 1 / e == -1 / 0 ? "-0" : t;
        }function Zr(e, t, n) {
          var r = -1,
              i = dt,
              o = e.length,
              s = !0,
              a = [],
              l = a;if (n) s = !1, i = ht;else if (o >= 200) {
            var u = t ? null : ji(e);if (u) return Gt(u);s = !1, i = Dt, l = new Nn();
          } else l = t ? [] : a;e: for (; ++r < o;) {
            var c = e[r],
                d = t ? t(c) : c;if (c = n || 0 !== c ? c : 0, s && d == d) {
              for (var h = l.length; h--;) {
                if (l[h] === d) continue e;
              }t && l.push(d), a.push(c);
            } else i(l, d, n) || (l !== a && l.push(d), a.push(c));
          }return a;
        }function Xr(e, t) {
          return null == (e = _o(e, t = ai(t, e))) || delete e[Eo(Fo(t))];
        }function ei(e, t, n, r) {
          return qr(e, t, n(dr(e, t)), r);
        }function ti(e, t, n, r) {
          for (var i = e.length, o = r ? i : -1; (r ? o-- : ++o < i) && t(e[o], o, e);) {}return n ? Br(e, r ? 0 : o, r ? o + 1 : i) : Br(e, r ? o + 1 : 0, r ? i : o);
        }function ni(e, t) {
          var n = e;return n instanceof Dn && (n = n.value()), gt(t, function (e, t) {
            return t.func.apply(t.thisArg, pt([e], t.args));
          }, n);
        }function ri(e, t, n) {
          var i = e.length;if (i < 2) return i ? Zr(e[0]) : [];for (var o = -1, s = r(i); ++o < i;) {
            for (var a = e[o], l = -1; ++l < i;) {
              l != o && (s[o] = Xn(s[o] || a, e[l], t, n));
            }
          }return Zr(or(s, 1), t, n);
        }function ii(e, t, n) {
          for (var r = -1, i = e.length, o = t.length, s = {}; ++r < i;) {
            var a = r < o ? t[r] : void 0;n(s, e[r], a);
          }return s;
        }function oi(e) {
          return Ns(e) ? e : [];
        }function si(e) {
          return "function" == typeof e ? e : Wa;
        }function ai(e, t) {
          return Os(e) ? e : lo(e, t) ? [e] : Ao(aa(e));
        }var li = Ur;function ui(e, t, n) {
          var r = e.length;return n = void 0 === n ? r : n, !t && n >= r ? e : Br(e, t, n);
        }var ci = Jt || function (e) {
          return Ye.clearTimeout(e);
        };function di(e, t) {
          if (t) return e.slice();var n = e.length,
              r = ze ? ze(n) : new e.constructor(n);return e.copy(r), r;
        }function hi(e) {
          var t = new e.constructor(e.byteLength);return new Ne(t).set(new Ne(e)), t;
        }function fi(e, t) {
          var n = t ? hi(e.buffer) : e.buffer;return new e.constructor(n, e.byteOffset, e.length);
        }function pi(e, t) {
          if (e !== t) {
            var n = void 0 !== e,
                r = null === e,
                i = e == e,
                o = $s(e),
                s = void 0 !== t,
                a = null === t,
                l = t == t,
                u = $s(t);if (!a && !u && !o && e > t || o && s && l && !a && !u || r && s && l || !n && l || !i) return 1;if (!r && !o && !u && e < t || u && n && i && !r && !o || a && n && i || !s && i || !l) return -1;
          }return 0;
        }function gi(e, t, n, i) {
          for (var o = -1, s = e.length, a = n.length, l = -1, u = t.length, c = sn(s - a, 0), d = r(u + c), h = !i; ++l < u;) {
            d[l] = t[l];
          }for (; ++o < a;) {
            (h || o < s) && (d[n[o]] = e[o]);
          }for (; c--;) {
            d[l++] = e[o++];
          }return d;
        }function _i(e, t, n, i) {
          for (var o = -1, s = e.length, a = -1, l = n.length, u = -1, c = t.length, d = sn(s - l, 0), h = r(d + c), f = !i; ++o < d;) {
            h[o] = e[o];
          }for (var p = o; ++u < c;) {
            h[p + u] = t[u];
          }for (; ++a < l;) {
            (f || o < s) && (h[p + n[a]] = e[o++]);
          }return h;
        }function mi(e, t) {
          var n = -1,
              i = e.length;for (t || (t = r(i)); ++n < i;) {
            t[n] = e[n];
          }return t;
        }function vi(e, t, n, r) {
          var i = !n;n || (n = {});for (var o = -1, s = t.length; ++o < s;) {
            var a = t[o],
                l = r ? r(n[a], e[a], a, n, e) : void 0;void 0 === l && (l = e[a]), i ? Yn(n, a, l) : Gn(n, a, l);
          }return n;
        }function yi(e, t) {
          return function (n, r) {
            var i = Os(n) ? st : Bn,
                o = t ? t() : {};return i(n, e, Qi(r, 2), o);
          };
        }function bi(e) {
          return Ur(function (t, n) {
            var r = -1,
                i = n.length,
                o = i > 1 ? n[i - 1] : void 0,
                s = i > 2 ? n[2] : void 0;for (o = e.length > 3 && "function" == typeof o ? (i--, o) : void 0, s && ao(n[0], n[1], s) && (o = i < 3 ? void 0 : o, i = 1), t = ge(t); ++r < i;) {
              var a = n[r];a && e(t, a, r, o);
            }return t;
          });
        }function Ci(e, t) {
          return function (n, r) {
            if (null == n) return n;if (!Ps(n)) return e(n, r);for (var i = n.length, o = t ? i : -1, s = ge(n); (t ? o-- : ++o < i) && !1 !== r(s[o], o, s);) {}return n;
          };
        }function Ti(e) {
          return function (t, n, r) {
            for (var i = -1, o = ge(t), s = r(t), a = s.length; a--;) {
              var l = s[e ? a : ++i];if (!1 === n(o[l], l, o)) break;
            }return t;
          };
        }function wi(e) {
          return function (t) {
            var n = Ft(t = aa(t)) ? Wt(t) : void 0,
                r = n ? n[0] : t.charAt(0),
                i = n ? ui(n, 1).join("") : t.slice(1);return r[e]() + i;
          };
        }function Si(e) {
          return function (t) {
            return gt(Ha(Da(t).replace(De, "")), e, "");
          };
        }function Ai(e) {
          return function () {
            var t = arguments;switch (t.length) {case 0:
                return new e();case 1:
                return new e(t[0]);case 2:
                return new e(t[0], t[1]);case 3:
                return new e(t[0], t[1], t[2]);case 4:
                return new e(t[0], t[1], t[2], t[3]);case 5:
                return new e(t[0], t[1], t[2], t[3], t[4]);case 6:
                return new e(t[0], t[1], t[2], t[3], t[4], t[5]);case 7:
                return new e(t[0], t[1], t[2], t[3], t[4], t[5], t[6]);}var n = kn(e.prototype),
                r = e.apply(n, t);return Gs(r) ? r : n;
          };
        }function Ei(e) {
          return function (t, n, r) {
            var i = ge(t);if (!Ps(t)) {
              var o = Qi(n, 3);t = ba(t), n = function n(e) {
                return o(i[e], e, i);
              };
            }var s = e(t, n, r);return s > -1 ? i[o ? t[s] : s] : void 0;
          };
        }function Ii(e) {
          return Vi(function (t) {
            var n = t.length,
                r = n,
                i = Mn.prototype.thru;for (e && t.reverse(); r--;) {
              var s = t[r];if ("function" != typeof s) throw new ve(o);if (i && !a && "wrapper" == Ki(s)) var a = new Mn([], !0);
            }for (r = a ? r : n; ++r < n;) {
              var l = Ki(s = t[r]),
                  u = "wrapper" == l ? Yi(s) : void 0;a = u && uo(u[0]) && 424 == u[1] && !u[4].length && 1 == u[9] ? a[Ki(u[0])].apply(a, u[3]) : 1 == s.length && uo(s) ? a[l]() : a.thru(s);
            }return function () {
              var e = arguments,
                  r = e[0];if (a && 1 == e.length && Os(r)) return a.plant(r).value();for (var i = 0, o = n ? t[i].apply(this, e) : r; ++i < n;) {
                o = t[i].call(this, o);
              }return o;
            };
          });
        }function Ri(e, t, n, i, o, s, a, l, u, c) {
          var d = 128 & t,
              h = 1 & t,
              f = 2 & t,
              p = 24 & t,
              g = 512 & t,
              _ = f ? void 0 : Ai(e);return function m() {
            for (var v = arguments.length, y = r(v), b = v; b--;) {
              y[b] = arguments[b];
            }if (p) var C = Ji(m),
                T = Pt(y, C);if (i && (y = gi(y, i, o, p)), s && (y = _i(y, s, a, p)), v -= T, p && v < c) {
              var w = zt(y, C);return Pi(e, t, Ri, m.placeholder, n, y, w, l, u, c - v);
            }var S = h ? n : this,
                A = f ? S[e] : e;return v = y.length, l ? y = mo(y, l) : g && v > 1 && y.reverse(), d && u < v && (y.length = u), this && this !== Ye && this instanceof m && (A = _ || Ai(A)), A.apply(S, y);
          };
        }function ki(e, t) {
          return function (n, r) {
            return function (e, t, n, r) {
              return lr(e, function (e, i, o) {
                t(r, n(e), i, o);
              }), r;
            }(n, e, t(r), {});
          };
        }function xi(e, t) {
          return function (n, r) {
            var i;if (void 0 === n && void 0 === r) return t;if (void 0 !== n && (i = n), void 0 !== r) {
              if (void 0 === i) return r;"string" == typeof n || "string" == typeof r ? (n = $r(n), r = $r(r)) : (n = Qr(n), r = Qr(r)), i = e(n, r);
            }return i;
          };
        }function Mi(e) {
          return Vi(function (t) {
            return t = ft(t, xt(Qi())), Ur(function (n) {
              var r = this;return e(t, function (e) {
                return ot(e, r, n);
              });
            });
          });
        }function Di(e, t) {
          var n = (t = void 0 === t ? " " : $r(t)).length;if (n < 2) return n ? jr(t, e) : t;var r = jr(t, Zt(e / Bt(t)));return Ft(t) ? ui(Wt(r), 0, e).join("") : r.slice(0, e);
        }function Oi(e) {
          return function (t, n, i) {
            return i && "number" != typeof i && ao(t, n, i) && (n = i = void 0), t = na(t), void 0 === n ? (n = t, t = 0) : n = na(n), function (e, t, n, i) {
              for (var o = -1, s = sn(Zt((t - e) / (n || 1)), 0), a = r(s); s--;) {
                a[i ? s : ++o] = e, e += n;
              }return a;
            }(t, n, i = void 0 === i ? t < n ? 1 : -1 : na(i), e);
          };
        }function Li(e) {
          return function (t, n) {
            return "string" == typeof t && "string" == typeof n || (t = oa(t), n = oa(n)), e(t, n);
          };
        }function Pi(e, t, n, r, i, o, s, a, l, u) {
          var c = 8 & t;t |= c ? 32 : 64, 4 & (t &= ~(c ? 64 : 32)) || (t &= -4);var d = [e, t, i, c ? o : void 0, c ? s : void 0, c ? void 0 : o, c ? void 0 : s, a, l, u],
              h = n.apply(void 0, d);return uo(e) && yo(h, d), h.placeholder = r, To(h, e, t);
        }function Ni(e) {
          var t = pe[e];return function (e, n) {
            if (e = oa(e), (n = null == n ? 0 : an(ra(n), 292)) && nn(e)) {
              var r = (aa(e) + "e").split("e");return +((r = (aa(t(r[0] + "e" + (+r[1] + n))) + "e").split("e"))[0] + "e" + (+r[1] - n));
            }return t(e);
          };
        }var ji = gn && 1 / Gt(new gn([, -0]))[1] == 1 / 0 ? function (e) {
          return new gn(e);
        } : $a;function Ui(e) {
          return function (t) {
            var n = no(t);return n == g ? Ht(t) : n == y ? Vt(t) : function (e, t) {
              return ft(t, function (t) {
                return [t, e[t]];
              });
            }(t, e(t));
          };
        }function Fi(e, t, n, i, a, l, u, c) {
          var d = 2 & t;if (!d && "function" != typeof e) throw new ve(o);var h = i ? i.length : 0;if (h || (t &= -97, i = a = void 0), u = void 0 === u ? u : sn(ra(u), 0), c = void 0 === c ? c : ra(c), h -= a ? a.length : 0, 64 & t) {
            var f = i,
                p = a;i = a = void 0;
          }var g = d ? void 0 : Yi(e),
              _ = [e, t, n, i, a, f, p, l, u, c];if (g && function (e, t) {
            var n = e[1],
                r = t[1],
                i = n | r,
                o = i < 131,
                a = 128 == r && 8 == n || 128 == r && 256 == n && e[7].length <= t[8] || 384 == r && t[7].length <= t[8] && 8 == n;if (!o && !a) return e;1 & r && (e[2] = t[2], i |= 1 & n ? 0 : 4);var l = t[3];if (l) {
              var u = e[3];e[3] = u ? gi(u, l, t[4]) : l, e[4] = u ? zt(e[3], s) : t[4];
            }(l = t[5]) && (u = e[5], e[5] = u ? _i(u, l, t[6]) : l, e[6] = u ? zt(e[5], s) : t[6]), (l = t[7]) && (e[7] = l), 128 & r && (e[8] = null == e[8] ? t[8] : an(e[8], t[8])), null == e[9] && (e[9] = t[9]), e[0] = t[0], e[1] = i;
          }(_, g), e = _[0], t = _[1], n = _[2], i = _[3], a = _[4], !(c = _[9] = void 0 === _[9] ? d ? 0 : e.length : sn(_[9] - h, 0)) && 24 & t && (t &= -25), t && 1 != t) m = 8 == t || 16 == t ? function (e, t, n) {
            var i = Ai(e);return function o() {
              for (var s = arguments.length, a = r(s), l = s, u = Ji(o); l--;) {
                a[l] = arguments[l];
              }var c = s < 3 && a[0] !== u && a[s - 1] !== u ? [] : zt(a, u);if ((s -= c.length) < n) return Pi(e, t, Ri, o.placeholder, void 0, a, c, void 0, void 0, n - s);var d = this && this !== Ye && this instanceof o ? i : e;return ot(d, this, a);
            };
          }(e, t, c) : 32 != t && 33 != t || a.length ? Ri.apply(void 0, _) : function (e, t, n, i) {
            var o = 1 & t,
                s = Ai(e);return function t() {
              for (var a = -1, l = arguments.length, u = -1, c = i.length, d = r(c + l), h = this && this !== Ye && this instanceof t ? s : e; ++u < c;) {
                d[u] = i[u];
              }for (; l--;) {
                d[u++] = arguments[++a];
              }return ot(h, o ? n : this, d);
            };
          }(e, t, n, i);else var m = function (e, t, n) {
            var r = 1 & t,
                i = Ai(e);return function t() {
              var o = this && this !== Ye && this instanceof t ? i : e;return o.apply(r ? n : this, arguments);
            };
          }(e, t, n);return To((g ? zr : yo)(m, _), e, t);
        }function Hi(e, t, n, r) {
          return void 0 === e || ks(e, Ce[n]) && !Se.call(r, n) ? t : e;
        }function qi(e, t, n, r, i, o) {
          return Gs(e) && Gs(t) && (o.set(t, e), xr(e, t, void 0, qi, o), o.delete(t)), e;
        }function zi(e) {
          return Ys(e) ? void 0 : e;
        }function Gi(e, t, n, r, i, o) {
          var s = 1 & n,
              a = e.length,
              l = t.length;if (a != l && !(s && l > a)) return !1;var u = o.get(e);if (u && o.get(t)) return u == t;var c = -1,
              d = !0,
              h = 2 & n ? new Nn() : void 0;for (o.set(e, t), o.set(t, e); ++c < a;) {
            var f = e[c],
                p = t[c];if (r) var g = s ? r(p, f, c, t, e, o) : r(f, p, c, e, t, o);if (void 0 !== g) {
              if (g) continue;d = !1;break;
            }if (h) {
              if (!mt(t, function (e, t) {
                if (!Dt(h, t) && (f === e || i(f, e, n, r, o))) return h.push(t);
              })) {
                d = !1;break;
              }
            } else if (f !== p && !i(f, p, n, r, o)) {
              d = !1;break;
            }
          }return o.delete(e), o.delete(t), d;
        }function Vi(e) {
          return Co(go(e, void 0, Lo), e + "");
        }function Bi(e) {
          return hr(e, ba, eo);
        }function Wi(e) {
          return hr(e, Ca, to);
        }var Yi = vn ? function (e) {
          return vn.get(e);
        } : $a;function Ki(e) {
          for (var t = e.name + "", n = yn[t], r = Se.call(yn, t) ? n.length : 0; r--;) {
            var i = n[r],
                o = i.func;if (null == o || o == e) return i.name;
          }return t;
        }function Ji(e) {
          return (Se.call(Rn, "placeholder") ? Rn : e).placeholder;
        }function Qi() {
          var e = Rn.iteratee || Ya;return e = e === Ya ? wr : e, arguments.length ? e(arguments[0], arguments[1]) : e;
        }function $i(e, t) {
          var n,
              r,
              i = e.__data__;return ("string" == (r = (0, _typeof3.default)(n = t)) || "number" == r || "symbol" == r || "boolean" == r ? "__proto__" !== n : null === n) ? i["string" == typeof t ? "string" : "hash"] : i.map;
        }function Zi(e) {
          for (var t = ba(e), n = t.length; n--;) {
            var r = t[n],
                i = e[r];t[n] = [r, i, fo(i)];
          }return t;
        }function Xi(e, t) {
          var n = function (e, t) {
            return null == e ? void 0 : e[t];
          }(e, t);return Tr(n) ? n : void 0;
        }var eo = en ? function (e) {
          return null == e ? [] : (e = ge(e), ct(en(e), function (t) {
            return Ke.call(e, t);
          }));
        } : il,
            to = en ? function (e) {
          for (var t = []; e;) {
            pt(t, eo(e)), e = Be(e);
          }return t;
        } : il,
            no = fr;function ro(e, t, n) {
          for (var r = -1, i = (t = ai(t, e)).length, o = !1; ++r < i;) {
            var s = Eo(t[r]);if (!(o = null != e && n(e, s))) break;e = e[s];
          }return o || ++r != i ? o : !!(i = null == e ? 0 : e.length) && zs(i) && so(s, i) && (Os(e) || Ds(e));
        }function io(e) {
          return "function" != typeof e.constructor || ho(e) ? {} : kn(Be(e));
        }function oo(e) {
          return Os(e) || Ds(e) || !!($e && e && e[$e]);
        }function so(e, t) {
          var n = typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);return !!(t = null == t ? 9007199254740991 : t) && ("number" == n || "symbol" != n && le.test(e)) && e > -1 && e % 1 == 0 && e < t;
        }function ao(e, t, n) {
          if (!Gs(n)) return !1;var r = typeof t === "undefined" ? "undefined" : (0, _typeof3.default)(t);return !!("number" == r ? Ps(n) && so(t, n.length) : "string" == r && t in n) && ks(n[t], e);
        }function lo(e, t) {
          if (Os(e)) return !1;var n = typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);return !("number" != n && "symbol" != n && "boolean" != n && null != e && !$s(e)) || V.test(e) || !G.test(e) || null != t && e in ge(t);
        }function uo(e) {
          var t = Ki(e),
              n = Rn[t];if ("function" != typeof n || !(t in Dn.prototype)) return !1;if (e === n) return !0;var r = Yi(n);return !!r && e === r[0];
        }(hn && no(new hn(new ArrayBuffer(1))) != S || fn && no(new fn()) != g || pn && "[object Promise]" != no(pn.resolve()) || gn && no(new gn()) != y || _n && no(new _n()) != T) && (no = function no(e) {
          var t = fr(e),
              n = t == m ? e.constructor : void 0,
              r = n ? Io(n) : "";if (r) switch (r) {case bn:
              return S;case Cn:
              return g;case Tn:
              return "[object Promise]";case wn:
              return y;case Sn:
              return T;}return t;
        });var co = Te ? Hs : ol;function ho(e) {
          var t = e && e.constructor;return e === ("function" == typeof t && t.prototype || Ce);
        }function fo(e) {
          return e == e && !Gs(e);
        }function po(e, t) {
          return function (n) {
            return null != n && n[e] === t && (void 0 !== t || e in ge(n));
          };
        }function go(e, t, n) {
          return t = sn(void 0 === t ? e.length - 1 : t, 0), function () {
            for (var i = arguments, o = -1, s = sn(i.length - t, 0), a = r(s); ++o < s;) {
              a[o] = i[t + o];
            }o = -1;for (var l = r(t + 1); ++o < t;) {
              l[o] = i[o];
            }return l[t] = n(a), ot(e, this, l);
          };
        }function _o(e, t) {
          return t.length < 2 ? e : dr(e, Br(t, 0, -1));
        }function mo(e, t) {
          for (var n = e.length, r = an(t.length, n), i = mi(e); r--;) {
            var o = t[r];e[r] = so(o, n) ? i[o] : void 0;
          }return e;
        }function vo(e, t) {
          if (("constructor" !== t || "function" != typeof e[t]) && "__proto__" != t) return e[t];
        }var yo = wo(zr),
            bo = $t || function (e, t) {
          return Ye.setTimeout(e, t);
        },
            Co = wo(Gr);function To(e, t, n) {
          var r = t + "";return Co(e, function (e, t) {
            var n = t.length;if (!n) return e;var r = n - 1;return t[r] = (n > 1 ? "& " : "") + t[r], t = t.join(n > 2 ? ", " : " "), e.replace($, "{\n/* [wrapped with " + t + "] */\n");
          }(r, function (e, t) {
            return at(a, function (n) {
              var r = "_." + n[0];t & n[1] && !dt(e, r) && e.push(r);
            }), e.sort();
          }(function (e) {
            var t = e.match(Z);return t ? t[1].split(X) : [];
          }(r), n)));
        }function wo(e) {
          var t = 0,
              n = 0;return function () {
            var r = ln(),
                i = 16 - (r - n);if (n = r, i > 0) {
              if (++t >= 800) return arguments[0];
            } else t = 0;return e.apply(void 0, arguments);
          };
        }function So(e, t) {
          var n = -1,
              r = e.length,
              i = r - 1;for (t = void 0 === t ? r : t; ++n < t;) {
            var o = Nr(n, i),
                s = e[o];e[o] = e[n], e[n] = s;
          }return e.length = t, e;
        }var Ao = function (e) {
          var t = ws(e, function (e) {
            return 500 === n.size && n.clear(), e;
          }),
              n = t.cache;return t;
        }(function (e) {
          var t = [];return 46 === e.charCodeAt(0) && t.push(""), e.replace(B, function (e, n, r, i) {
            t.push(r ? i.replace(te, "$1") : n || e);
          }), t;
        });function Eo(e) {
          if ("string" == typeof e || $s(e)) return e;var t = e + "";return "0" == t && 1 / e == -1 / 0 ? "-0" : t;
        }function Io(e) {
          if (null != e) {
            try {
              return we.call(e);
            } catch (e) {}try {
              return e + "";
            } catch (e) {}
          }return "";
        }function Ro(e) {
          if (e instanceof Dn) return e.clone();var t = new Mn(e.__wrapped__, e.__chain__);return t.__actions__ = mi(e.__actions__), t.__index__ = e.__index__, t.__values__ = e.__values__, t;
        }var ko = Ur(function (e, t) {
          return Ns(e) ? Xn(e, or(t, 1, Ns, !0)) : [];
        }),
            xo = Ur(function (e, t) {
          var n = Fo(t);return Ns(n) && (n = void 0), Ns(e) ? Xn(e, or(t, 1, Ns, !0), Qi(n, 2)) : [];
        }),
            Mo = Ur(function (e, t) {
          var n = Fo(t);return Ns(n) && (n = void 0), Ns(e) ? Xn(e, or(t, 1, Ns, !0), void 0, n) : [];
        });function Do(e, t, n) {
          var r = null == e ? 0 : e.length;if (!r) return -1;var i = null == n ? 0 : ra(n);return i < 0 && (i = sn(r + i, 0)), bt(e, Qi(t, 3), i);
        }function Oo(e, t, n) {
          var r = null == e ? 0 : e.length;if (!r) return -1;var i = r - 1;return void 0 !== n && (i = ra(n), i = n < 0 ? sn(r + i, 0) : an(i, r - 1)), bt(e, Qi(t, 3), i, !0);
        }function Lo(e) {
          return null != e && e.length ? or(e, 1) : [];
        }function Po(e) {
          return e && e.length ? e[0] : void 0;
        }var No = Ur(function (e) {
          var t = ft(e, oi);return t.length && t[0] === e[0] ? mr(t) : [];
        }),
            jo = Ur(function (e) {
          var t = Fo(e),
              n = ft(e, oi);return t === Fo(n) ? t = void 0 : n.pop(), n.length && n[0] === e[0] ? mr(n, Qi(t, 2)) : [];
        }),
            Uo = Ur(function (e) {
          var t = Fo(e),
              n = ft(e, oi);return (t = "function" == typeof t ? t : void 0) && n.pop(), n.length && n[0] === e[0] ? mr(n, void 0, t) : [];
        });function Fo(e) {
          var t = null == e ? 0 : e.length;return t ? e[t - 1] : void 0;
        }var Ho = Ur(qo);function qo(e, t) {
          return e && e.length && t && t.length ? Lr(e, t) : e;
        }var zo = Vi(function (e, t) {
          var n = null == e ? 0 : e.length,
              r = Kn(e, t);return Pr(e, ft(t, function (e) {
            return so(e, n) ? +e : e;
          }).sort(pi)), r;
        });function Go(e) {
          return null == e ? e : dn.call(e);
        }var Vo = Ur(function (e) {
          return Zr(or(e, 1, Ns, !0));
        }),
            Bo = Ur(function (e) {
          var t = Fo(e);return Ns(t) && (t = void 0), Zr(or(e, 1, Ns, !0), Qi(t, 2));
        }),
            Wo = Ur(function (e) {
          var t = Fo(e);return t = "function" == typeof t ? t : void 0, Zr(or(e, 1, Ns, !0), void 0, t);
        });function Yo(e) {
          if (!e || !e.length) return [];var t = 0;return e = ct(e, function (e) {
            if (Ns(e)) return t = sn(e.length, t), !0;
          }), kt(t, function (t) {
            return ft(e, At(t));
          });
        }function Ko(e, t) {
          if (!e || !e.length) return [];var n = Yo(e);return null == t ? n : ft(n, function (e) {
            return ot(t, void 0, e);
          });
        }var Jo = Ur(function (e, t) {
          return Ns(e) ? Xn(e, t) : [];
        }),
            Qo = Ur(function (e) {
          return ri(ct(e, Ns));
        }),
            $o = Ur(function (e) {
          var t = Fo(e);return Ns(t) && (t = void 0), ri(ct(e, Ns), Qi(t, 2));
        }),
            Zo = Ur(function (e) {
          var t = Fo(e);return t = "function" == typeof t ? t : void 0, ri(ct(e, Ns), void 0, t);
        }),
            Xo = Ur(Yo),
            es = Ur(function (e) {
          var t = e.length,
              n = t > 1 ? e[t - 1] : void 0;return n = "function" == typeof n ? (e.pop(), n) : void 0, Ko(e, n);
        });function ts(e) {
          var t = Rn(e);return t.__chain__ = !0, t;
        }function ns(e, t) {
          return t(e);
        }var rs = Vi(function (e) {
          var t = e.length,
              n = t ? e[0] : 0,
              r = this.__wrapped__,
              i = function i(t) {
            return Kn(t, e);
          };return !(t > 1 || this.__actions__.length) && r instanceof Dn && so(n) ? ((r = r.slice(n, +n + (t ? 1 : 0))).__actions__.push({ func: ns, args: [i], thisArg: void 0 }), new Mn(r, this.__chain__).thru(function (e) {
            return t && !e.length && e.push(void 0), e;
          })) : this.thru(i);
        }),
            is = yi(function (e, t, n) {
          Se.call(e, n) ? ++e[n] : Yn(e, n, 1);
        }),
            os = Ei(Do),
            ss = Ei(Oo);function as(e, t) {
          return (Os(e) ? at : er)(e, Qi(t, 3));
        }function ls(e, t) {
          return (Os(e) ? lt : tr)(e, Qi(t, 3));
        }var us = yi(function (e, t, n) {
          Se.call(e, n) ? e[n].push(t) : Yn(e, n, [t]);
        }),
            cs = Ur(function (e, t, n) {
          var i = -1,
              o = "function" == typeof t,
              s = Ps(e) ? r(e.length) : [];return er(e, function (e) {
            s[++i] = o ? ot(t, e, n) : vr(e, t, n);
          }), s;
        }),
            ds = yi(function (e, t, n) {
          Yn(e, n, t);
        });function hs(e, t) {
          return (Os(e) ? ft : Ir)(e, Qi(t, 3));
        }var fs = yi(function (e, t, n) {
          e[n ? 0 : 1].push(t);
        }, function () {
          return [[], []];
        }),
            ps = Ur(function (e, t) {
          if (null == e) return [];var n = t.length;return n > 1 && ao(e, t[0], t[1]) ? t = [] : n > 2 && ao(t[0], t[1], t[2]) && (t = [t[0]]), Dr(e, or(t, 1), []);
        }),
            gs = Qt || function () {
          return Ye.Date.now();
        };function _s(e, t, n) {
          return t = n ? void 0 : t, Fi(e, 128, void 0, void 0, void 0, void 0, t = e && null == t ? e.length : t);
        }function ms(e, t) {
          var n;if ("function" != typeof t) throw new ve(o);return e = ra(e), function () {
            return --e > 0 && (n = t.apply(this, arguments)), e <= 1 && (t = void 0), n;
          };
        }var vs = Ur(function (e, t, n) {
          var r = 1;if (n.length) {
            var i = zt(n, Ji(vs));r |= 32;
          }return Fi(e, r, t, n, i);
        }),
            ys = Ur(function (e, t, n) {
          var r = 3;if (n.length) {
            var i = zt(n, Ji(ys));r |= 32;
          }return Fi(t, r, e, n, i);
        });function bs(e, t, n) {
          var r,
              i,
              s,
              a,
              l,
              u,
              c = 0,
              d = !1,
              h = !1,
              f = !0;if ("function" != typeof e) throw new ve(o);function p(t) {
            var n = r,
                o = i;return r = i = void 0, c = t, a = e.apply(o, n);
          }function g(e) {
            return c = e, l = bo(m, t), d ? p(e) : a;
          }function _(e) {
            var n = e - u;return void 0 === u || n >= t || n < 0 || h && e - c >= s;
          }function m() {
            var e = gs();if (_(e)) return v(e);l = bo(m, function (e) {
              var n = t - (e - u);return h ? an(n, s - (e - c)) : n;
            }(e));
          }function v(e) {
            return l = void 0, f && r ? p(e) : (r = i = void 0, a);
          }function y() {
            var e = gs(),
                n = _(e);if (r = arguments, i = this, u = e, n) {
              if (void 0 === l) return g(u);if (h) return ci(l), l = bo(m, t), p(u);
            }return void 0 === l && (l = bo(m, t)), a;
          }return t = oa(t) || 0, Gs(n) && (d = !!n.leading, s = (h = "maxWait" in n) ? sn(oa(n.maxWait) || 0, t) : s, f = "trailing" in n ? !!n.trailing : f), y.cancel = function () {
            void 0 !== l && ci(l), c = 0, r = u = i = l = void 0;
          }, y.flush = function () {
            return void 0 === l ? a : v(gs());
          }, y;
        }var Cs = Ur(function (e, t) {
          return Zn(e, 1, t);
        }),
            Ts = Ur(function (e, t, n) {
          return Zn(e, oa(t) || 0, n);
        });function ws(e, t) {
          if ("function" != typeof e || null != t && "function" != typeof t) throw new ve(o);var n = function n() {
            var r = arguments,
                i = t ? t.apply(this, r) : r[0],
                o = n.cache;if (o.has(i)) return o.get(i);var s = e.apply(this, r);return n.cache = o.set(i, s) || o, s;
          };return n.cache = new (ws.Cache || Pn)(), n;
        }function Ss(e) {
          if ("function" != typeof e) throw new ve(o);return function () {
            var t = arguments;switch (t.length) {case 0:
                return !e.call(this);case 1:
                return !e.call(this, t[0]);case 2:
                return !e.call(this, t[0], t[1]);case 3:
                return !e.call(this, t[0], t[1], t[2]);}return !e.apply(this, t);
          };
        }ws.Cache = Pn;var As = li(function (e, t) {
          var n = (t = 1 == t.length && Os(t[0]) ? ft(t[0], xt(Qi())) : ft(or(t, 1), xt(Qi()))).length;return Ur(function (r) {
            for (var i = -1, o = an(r.length, n); ++i < o;) {
              r[i] = t[i].call(this, r[i]);
            }return ot(e, this, r);
          });
        }),
            Es = Ur(function (e, t) {
          return Fi(e, 32, void 0, t, zt(t, Ji(Es)));
        }),
            Is = Ur(function (e, t) {
          return Fi(e, 64, void 0, t, zt(t, Ji(Is)));
        }),
            Rs = Vi(function (e, t) {
          return Fi(e, 256, void 0, void 0, void 0, t);
        });function ks(e, t) {
          return e === t || e != e && t != t;
        }var xs = Li(pr),
            Ms = Li(function (e, t) {
          return e >= t;
        }),
            Ds = yr(function () {
          return arguments;
        }()) ? yr : function (e) {
          return Vs(e) && Se.call(e, "callee") && !Ke.call(e, "callee");
        },
            Os = r.isArray,
            Ls = Xe ? xt(Xe) : function (e) {
          return Vs(e) && fr(e) == w;
        };function Ps(e) {
          return null != e && zs(e.length) && !Hs(e);
        }function Ns(e) {
          return Vs(e) && Ps(e);
        }var js = tn || ol,
            Us = et ? xt(et) : function (e) {
          return Vs(e) && fr(e) == d;
        };function Fs(e) {
          if (!Vs(e)) return !1;var t = fr(e);return t == h || "[object DOMException]" == t || "string" == typeof e.message && "string" == typeof e.name && !Ys(e);
        }function Hs(e) {
          if (!Gs(e)) return !1;var t = fr(e);return t == f || t == p || "[object AsyncFunction]" == t || "[object Proxy]" == t;
        }function qs(e) {
          return "number" == typeof e && e == ra(e);
        }function zs(e) {
          return "number" == typeof e && e > -1 && e % 1 == 0 && e <= 9007199254740991;
        }function Gs(e) {
          var t = typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);return null != e && ("object" == t || "function" == t);
        }function Vs(e) {
          return null != e && "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e));
        }var Bs = tt ? xt(tt) : function (e) {
          return Vs(e) && no(e) == g;
        };function Ws(e) {
          return "number" == typeof e || Vs(e) && fr(e) == _;
        }function Ys(e) {
          if (!Vs(e) || fr(e) != m) return !1;var t = Be(e);if (null === t) return !0;var n = Se.call(t, "constructor") && t.constructor;return "function" == typeof n && n instanceof n && we.call(n) == Re;
        }var Ks = nt ? xt(nt) : function (e) {
          return Vs(e) && fr(e) == v;
        },
            Js = rt ? xt(rt) : function (e) {
          return Vs(e) && no(e) == y;
        };function Qs(e) {
          return "string" == typeof e || !Os(e) && Vs(e) && fr(e) == b;
        }function $s(e) {
          return "symbol" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || Vs(e) && fr(e) == C;
        }var Zs = it ? xt(it) : function (e) {
          return Vs(e) && zs(e.length) && !!He[fr(e)];
        },
            Xs = Li(Er),
            ea = Li(function (e, t) {
          return e <= t;
        });function ta(e) {
          if (!e) return [];if (Ps(e)) return Qs(e) ? Wt(e) : mi(e);if (Ze && e[Ze]) return function (e) {
            for (var t, n = []; !(t = e.next()).done;) {
              n.push(t.value);
            }return n;
          }(e[Ze]());var t = no(e);return (t == g ? Ht : t == y ? Gt : ka)(e);
        }function na(e) {
          return e ? (e = oa(e)) === 1 / 0 || e === -1 / 0 ? 17976931348623157e292 * (e < 0 ? -1 : 1) : e == e ? e : 0 : 0 === e ? e : 0;
        }function ra(e) {
          var t = na(e),
              n = t % 1;return t == t ? n ? t - n : t : 0;
        }function ia(e) {
          return e ? Jn(ra(e), 0, 4294967295) : 0;
        }function oa(e) {
          if ("number" == typeof e) return e;if ($s(e)) return NaN;if (Gs(e)) {
            var t = "function" == typeof e.valueOf ? e.valueOf() : e;e = Gs(t) ? t + "" : t;
          }if ("string" != typeof e) return 0 === e ? e : +e;e = e.replace(K, "");var n = oe.test(e);return n || ae.test(e) ? Ve(e.slice(2), n ? 2 : 8) : ie.test(e) ? NaN : +e;
        }function sa(e) {
          return vi(e, Ca(e));
        }function aa(e) {
          return null == e ? "" : $r(e);
        }var la = bi(function (e, t) {
          if (ho(t) || Ps(t)) vi(t, ba(t), e);else for (var n in t) {
            Se.call(t, n) && Gn(e, n, t[n]);
          }
        }),
            ua = bi(function (e, t) {
          vi(t, Ca(t), e);
        }),
            ca = bi(function (e, t, n, r) {
          vi(t, Ca(t), e, r);
        }),
            da = bi(function (e, t, n, r) {
          vi(t, ba(t), e, r);
        }),
            ha = Vi(Kn),
            fa = Ur(function (e, t) {
          e = ge(e);var n = -1,
              r = t.length,
              i = r > 2 ? t[2] : void 0;for (i && ao(t[0], t[1], i) && (r = 1); ++n < r;) {
            for (var o = t[n], s = Ca(o), a = -1, l = s.length; ++a < l;) {
              var u = s[a],
                  c = e[u];(void 0 === c || ks(c, Ce[u]) && !Se.call(e, u)) && (e[u] = o[u]);
            }
          }return e;
        }),
            pa = Ur(function (e) {
          return e.push(void 0, qi), ot(wa, void 0, e);
        });function ga(e, t, n) {
          var r = null == e ? void 0 : dr(e, t);return void 0 === r ? n : r;
        }function _a(e, t) {
          return null != e && ro(e, t, _r);
        }var ma = ki(function (e, t, n) {
          null != t && "function" != typeof t.toString && (t = Ie.call(t)), e[t] = n;
        }, Ga(Wa)),
            va = ki(function (e, t, n) {
          null != t && "function" != typeof t.toString && (t = Ie.call(t)), Se.call(e, t) ? e[t].push(n) : e[t] = [n];
        }, Qi),
            ya = Ur(vr);function ba(e) {
          return Ps(e) ? Un(e) : Sr(e);
        }function Ca(e) {
          return Ps(e) ? Un(e, !0) : Ar(e);
        }var Ta = bi(function (e, t, n) {
          xr(e, t, n);
        }),
            wa = bi(function (e, t, n, r) {
          xr(e, t, n, r);
        }),
            Sa = Vi(function (e, t) {
          var n = {};if (null == e) return n;var r = !1;t = ft(t, function (t) {
            return t = ai(t, e), r || (r = t.length > 1), t;
          }), vi(e, Wi(e), n), r && (n = Qn(n, 7, zi));for (var i = t.length; i--;) {
            Xr(n, t[i]);
          }return n;
        }),
            Aa = Vi(function (e, t) {
          return null == e ? {} : function (e, t) {
            return Or(e, t, function (t, n) {
              return _a(e, n);
            });
          }(e, t);
        });function Ea(e, t) {
          if (null == e) return {};var n = ft(Wi(e), function (e) {
            return [e];
          });return t = Qi(t), Or(e, n, function (e, n) {
            return t(e, n[0]);
          });
        }var Ia = Ui(ba),
            Ra = Ui(Ca);function ka(e) {
          return null == e ? [] : Mt(e, ba(e));
        }var xa = Si(function (e, t, n) {
          return t = t.toLowerCase(), e + (n ? Ma(t) : t);
        });function Ma(e) {
          return Fa(aa(e).toLowerCase());
        }function Da(e) {
          return (e = aa(e)) && e.replace(ue, Nt).replace(Oe, "");
        }var Oa = Si(function (e, t, n) {
          return e + (n ? "-" : "") + t.toLowerCase();
        }),
            La = Si(function (e, t, n) {
          return e + (n ? " " : "") + t.toLowerCase();
        }),
            Pa = wi("toLowerCase"),
            Na = Si(function (e, t, n) {
          return e + (n ? "_" : "") + t.toLowerCase();
        }),
            ja = Si(function (e, t, n) {
          return e + (n ? " " : "") + Fa(t);
        }),
            Ua = Si(function (e, t, n) {
          return e + (n ? " " : "") + t.toUpperCase();
        }),
            Fa = wi("toUpperCase");function Ha(e, t, n) {
          return e = aa(e), void 0 === (t = n ? void 0 : t) ? function (e) {
            return je.test(e);
          }(e) ? function (e) {
            return e.match(Pe) || [];
          }(e) : function (e) {
            return e.match(ee) || [];
          }(e) : e.match(t) || [];
        }var qa = Ur(function (e, t) {
          try {
            return ot(e, void 0, t);
          } catch (e) {
            return Fs(e) ? e : new he(e);
          }
        }),
            za = Vi(function (e, t) {
          return at(t, function (t) {
            t = Eo(t), Yn(e, t, vs(e[t], e));
          }), e;
        });function Ga(e) {
          return function () {
            return e;
          };
        }var Va = Ii(),
            Ba = Ii(!0);function Wa(e) {
          return e;
        }function Ya(e) {
          return wr("function" == typeof e ? e : Qn(e, 1));
        }var Ka = Ur(function (e, t) {
          return function (n) {
            return vr(n, e, t);
          };
        }),
            Ja = Ur(function (e, t) {
          return function (n) {
            return vr(e, n, t);
          };
        });function Qa(e, t, n) {
          var r = ba(t),
              i = cr(t, r);null != n || Gs(t) && (i.length || !r.length) || (n = t, t = e, e = this, i = cr(t, ba(t)));var o = !(Gs(n) && "chain" in n && !n.chain),
              s = Hs(e);return at(i, function (n) {
            var r = t[n];e[n] = r, s && (e.prototype[n] = function () {
              var t = this.__chain__;if (o || t) {
                var n = e(this.__wrapped__),
                    i = n.__actions__ = mi(this.__actions__);return i.push({ func: r, args: arguments, thisArg: e }), n.__chain__ = t, n;
              }return r.apply(e, pt([this.value()], arguments));
            });
          }), e;
        }function $a() {}var Za = Mi(ft),
            Xa = Mi(ut),
            el = Mi(mt);function tl(e) {
          return lo(e) ? At(Eo(e)) : function (e) {
            return function (t) {
              return dr(t, e);
            };
          }(e);
        }var nl = Oi(),
            rl = Oi(!0);function il() {
          return [];
        }function ol() {
          return !1;
        }var sl,
            al = xi(function (e, t) {
          return e + t;
        }, 0),
            ll = Ni("ceil"),
            ul = xi(function (e, t) {
          return e / t;
        }, 1),
            cl = Ni("floor"),
            dl = xi(function (e, t) {
          return e * t;
        }, 1),
            hl = Ni("round"),
            fl = xi(function (e, t) {
          return e - t;
        }, 0);return Rn.after = function (e, t) {
          if ("function" != typeof t) throw new ve(o);return e = ra(e), function () {
            if (--e < 1) return t.apply(this, arguments);
          };
        }, Rn.ary = _s, Rn.assign = la, Rn.assignIn = ua, Rn.assignInWith = ca, Rn.assignWith = da, Rn.at = ha, Rn.before = ms, Rn.bind = vs, Rn.bindAll = za, Rn.bindKey = ys, Rn.castArray = function () {
          if (!arguments.length) return [];var e = arguments[0];return Os(e) ? e : [e];
        }, Rn.chain = ts, Rn.chunk = function (e, t, n) {
          t = (n ? ao(e, t, n) : void 0 === t) ? 1 : sn(ra(t), 0);var i = null == e ? 0 : e.length;if (!i || t < 1) return [];for (var o = 0, s = 0, a = r(Zt(i / t)); o < i;) {
            a[s++] = Br(e, o, o += t);
          }return a;
        }, Rn.compact = function (e) {
          for (var t = -1, n = null == e ? 0 : e.length, r = 0, i = []; ++t < n;) {
            var o = e[t];o && (i[r++] = o);
          }return i;
        }, Rn.concat = function () {
          var e = arguments.length;if (!e) return [];for (var t = r(e - 1), n = arguments[0], i = e; i--;) {
            t[i - 1] = arguments[i];
          }return pt(Os(n) ? mi(n) : [n], or(t, 1));
        }, Rn.cond = function (e) {
          var t = null == e ? 0 : e.length,
              n = Qi();return e = t ? ft(e, function (e) {
            if ("function" != typeof e[1]) throw new ve(o);return [n(e[0]), e[1]];
          }) : [], Ur(function (n) {
            for (var r = -1; ++r < t;) {
              var i = e[r];if (ot(i[0], this, n)) return ot(i[1], this, n);
            }
          });
        }, Rn.conforms = function (e) {
          return function (e) {
            var t = ba(e);return function (n) {
              return $n(n, e, t);
            };
          }(Qn(e, 1));
        }, Rn.constant = Ga, Rn.countBy = is, Rn.create = function (e, t) {
          var n = kn(e);return null == t ? n : Wn(n, t);
        }, Rn.curry = function e(t, n, r) {
          var i = Fi(t, 8, void 0, void 0, void 0, void 0, void 0, n = r ? void 0 : n);return i.placeholder = e.placeholder, i;
        }, Rn.curryRight = function e(t, n, r) {
          var i = Fi(t, 16, void 0, void 0, void 0, void 0, void 0, n = r ? void 0 : n);return i.placeholder = e.placeholder, i;
        }, Rn.debounce = bs, Rn.defaults = fa, Rn.defaultsDeep = pa, Rn.defer = Cs, Rn.delay = Ts, Rn.difference = ko, Rn.differenceBy = xo, Rn.differenceWith = Mo, Rn.drop = function (e, t, n) {
          var r = null == e ? 0 : e.length;return r ? Br(e, (t = n || void 0 === t ? 1 : ra(t)) < 0 ? 0 : t, r) : [];
        }, Rn.dropRight = function (e, t, n) {
          var r = null == e ? 0 : e.length;return r ? Br(e, 0, (t = r - (t = n || void 0 === t ? 1 : ra(t))) < 0 ? 0 : t) : [];
        }, Rn.dropRightWhile = function (e, t) {
          return e && e.length ? ti(e, Qi(t, 3), !0, !0) : [];
        }, Rn.dropWhile = function (e, t) {
          return e && e.length ? ti(e, Qi(t, 3), !0) : [];
        }, Rn.fill = function (e, t, n, r) {
          var i = null == e ? 0 : e.length;return i ? (n && "number" != typeof n && ao(e, t, n) && (n = 0, r = i), function (e, t, n, r) {
            var i = e.length;for ((n = ra(n)) < 0 && (n = -n > i ? 0 : i + n), (r = void 0 === r || r > i ? i : ra(r)) < 0 && (r += i), r = n > r ? 0 : ia(r); n < r;) {
              e[n++] = t;
            }return e;
          }(e, t, n, r)) : [];
        }, Rn.filter = function (e, t) {
          return (Os(e) ? ct : ir)(e, Qi(t, 3));
        }, Rn.flatMap = function (e, t) {
          return or(hs(e, t), 1);
        }, Rn.flatMapDeep = function (e, t) {
          return or(hs(e, t), 1 / 0);
        }, Rn.flatMapDepth = function (e, t, n) {
          return n = void 0 === n ? 1 : ra(n), or(hs(e, t), n);
        }, Rn.flatten = Lo, Rn.flattenDeep = function (e) {
          return null != e && e.length ? or(e, 1 / 0) : [];
        }, Rn.flattenDepth = function (e, t) {
          return null != e && e.length ? or(e, t = void 0 === t ? 1 : ra(t)) : [];
        }, Rn.flip = function (e) {
          return Fi(e, 512);
        }, Rn.flow = Va, Rn.flowRight = Ba, Rn.fromPairs = function (e) {
          for (var t = -1, n = null == e ? 0 : e.length, r = {}; ++t < n;) {
            var i = e[t];r[i[0]] = i[1];
          }return r;
        }, Rn.functions = function (e) {
          return null == e ? [] : cr(e, ba(e));
        }, Rn.functionsIn = function (e) {
          return null == e ? [] : cr(e, Ca(e));
        }, Rn.groupBy = us, Rn.initial = function (e) {
          return null != e && e.length ? Br(e, 0, -1) : [];
        }, Rn.intersection = No, Rn.intersectionBy = jo, Rn.intersectionWith = Uo, Rn.invert = ma, Rn.invertBy = va, Rn.invokeMap = cs, Rn.iteratee = Ya, Rn.keyBy = ds, Rn.keys = ba, Rn.keysIn = Ca, Rn.map = hs, Rn.mapKeys = function (e, t) {
          var n = {};return t = Qi(t, 3), lr(e, function (e, r, i) {
            Yn(n, t(e, r, i), e);
          }), n;
        }, Rn.mapValues = function (e, t) {
          var n = {};return t = Qi(t, 3), lr(e, function (e, r, i) {
            Yn(n, r, t(e, r, i));
          }), n;
        }, Rn.matches = function (e) {
          return Rr(Qn(e, 1));
        }, Rn.matchesProperty = function (e, t) {
          return kr(e, Qn(t, 1));
        }, Rn.memoize = ws, Rn.merge = Ta, Rn.mergeWith = wa, Rn.method = Ka, Rn.methodOf = Ja, Rn.mixin = Qa, Rn.negate = Ss, Rn.nthArg = function (e) {
          return e = ra(e), Ur(function (t) {
            return Mr(t, e);
          });
        }, Rn.omit = Sa, Rn.omitBy = function (e, t) {
          return Ea(e, Ss(Qi(t)));
        }, Rn.once = function (e) {
          return ms(2, e);
        }, Rn.orderBy = function (e, t, n, r) {
          return null == e ? [] : (Os(t) || (t = null == t ? [] : [t]), Os(n = r ? void 0 : n) || (n = null == n ? [] : [n]), Dr(e, t, n));
        }, Rn.over = Za, Rn.overArgs = As, Rn.overEvery = Xa, Rn.overSome = el, Rn.partial = Es, Rn.partialRight = Is, Rn.partition = fs, Rn.pick = Aa, Rn.pickBy = Ea, Rn.property = tl, Rn.propertyOf = function (e) {
          return function (t) {
            return null == e ? void 0 : dr(e, t);
          };
        }, Rn.pull = Ho, Rn.pullAll = qo, Rn.pullAllBy = function (e, t, n) {
          return e && e.length && t && t.length ? Lr(e, t, Qi(n, 2)) : e;
        }, Rn.pullAllWith = function (e, t, n) {
          return e && e.length && t && t.length ? Lr(e, t, void 0, n) : e;
        }, Rn.pullAt = zo, Rn.range = nl, Rn.rangeRight = rl, Rn.rearg = Rs, Rn.reject = function (e, t) {
          return (Os(e) ? ct : ir)(e, Ss(Qi(t, 3)));
        }, Rn.remove = function (e, t) {
          var n = [];if (!e || !e.length) return n;var r = -1,
              i = [],
              o = e.length;for (t = Qi(t, 3); ++r < o;) {
            var s = e[r];t(s, r, e) && (n.push(s), i.push(r));
          }return Pr(e, i), n;
        }, Rn.rest = function (e, t) {
          if ("function" != typeof e) throw new ve(o);return Ur(e, t = void 0 === t ? t : ra(t));
        }, Rn.reverse = Go, Rn.sampleSize = function (e, t, n) {
          return t = (n ? ao(e, t, n) : void 0 === t) ? 1 : ra(t), (Os(e) ? Hn : Hr)(e, t);
        }, Rn.set = function (e, t, n) {
          return null == e ? e : qr(e, t, n);
        }, Rn.setWith = function (e, t, n, r) {
          return r = "function" == typeof r ? r : void 0, null == e ? e : qr(e, t, n, r);
        }, Rn.shuffle = function (e) {
          return (Os(e) ? qn : Vr)(e);
        }, Rn.slice = function (e, t, n) {
          var r = null == e ? 0 : e.length;return r ? (n && "number" != typeof n && ao(e, t, n) ? (t = 0, n = r) : (t = null == t ? 0 : ra(t), n = void 0 === n ? r : ra(n)), Br(e, t, n)) : [];
        }, Rn.sortBy = ps, Rn.sortedUniq = function (e) {
          return e && e.length ? Jr(e) : [];
        }, Rn.sortedUniqBy = function (e, t) {
          return e && e.length ? Jr(e, Qi(t, 2)) : [];
        }, Rn.split = function (e, t, n) {
          return n && "number" != typeof n && ao(e, t, n) && (t = n = void 0), (n = void 0 === n ? 4294967295 : n >>> 0) ? (e = aa(e)) && ("string" == typeof t || null != t && !Ks(t)) && !(t = $r(t)) && Ft(e) ? ui(Wt(e), 0, n) : e.split(t, n) : [];
        }, Rn.spread = function (e, t) {
          if ("function" != typeof e) throw new ve(o);return t = null == t ? 0 : sn(ra(t), 0), Ur(function (n) {
            var r = n[t],
                i = ui(n, 0, t);return r && pt(i, r), ot(e, this, i);
          });
        }, Rn.tail = function (e) {
          var t = null == e ? 0 : e.length;return t ? Br(e, 1, t) : [];
        }, Rn.take = function (e, t, n) {
          return e && e.length ? Br(e, 0, (t = n || void 0 === t ? 1 : ra(t)) < 0 ? 0 : t) : [];
        }, Rn.takeRight = function (e, t, n) {
          var r = null == e ? 0 : e.length;return r ? Br(e, (t = r - (t = n || void 0 === t ? 1 : ra(t))) < 0 ? 0 : t, r) : [];
        }, Rn.takeRightWhile = function (e, t) {
          return e && e.length ? ti(e, Qi(t, 3), !1, !0) : [];
        }, Rn.takeWhile = function (e, t) {
          return e && e.length ? ti(e, Qi(t, 3)) : [];
        }, Rn.tap = function (e, t) {
          return t(e), e;
        }, Rn.throttle = function (e, t, n) {
          var r = !0,
              i = !0;if ("function" != typeof e) throw new ve(o);return Gs(n) && (r = "leading" in n ? !!n.leading : r, i = "trailing" in n ? !!n.trailing : i), bs(e, t, { leading: r, maxWait: t, trailing: i });
        }, Rn.thru = ns, Rn.toArray = ta, Rn.toPairs = Ia, Rn.toPairsIn = Ra, Rn.toPath = function (e) {
          return Os(e) ? ft(e, Eo) : $s(e) ? [e] : mi(Ao(aa(e)));
        }, Rn.toPlainObject = sa, Rn.transform = function (e, t, n) {
          var r = Os(e),
              i = r || js(e) || Zs(e);if (t = Qi(t, 4), null == n) {
            var o = e && e.constructor;n = i ? r ? new o() : [] : Gs(e) && Hs(o) ? kn(Be(e)) : {};
          }return (i ? at : lr)(e, function (e, r, i) {
            return t(n, e, r, i);
          }), n;
        }, Rn.unary = function (e) {
          return _s(e, 1);
        }, Rn.union = Vo, Rn.unionBy = Bo, Rn.unionWith = Wo, Rn.uniq = function (e) {
          return e && e.length ? Zr(e) : [];
        }, Rn.uniqBy = function (e, t) {
          return e && e.length ? Zr(e, Qi(t, 2)) : [];
        }, Rn.uniqWith = function (e, t) {
          return t = "function" == typeof t ? t : void 0, e && e.length ? Zr(e, void 0, t) : [];
        }, Rn.unset = function (e, t) {
          return null == e || Xr(e, t);
        }, Rn.unzip = Yo, Rn.unzipWith = Ko, Rn.update = function (e, t, n) {
          return null == e ? e : ei(e, t, si(n));
        }, Rn.updateWith = function (e, t, n, r) {
          return r = "function" == typeof r ? r : void 0, null == e ? e : ei(e, t, si(n), r);
        }, Rn.values = ka, Rn.valuesIn = function (e) {
          return null == e ? [] : Mt(e, Ca(e));
        }, Rn.without = Jo, Rn.words = Ha, Rn.wrap = function (e, t) {
          return Es(si(t), e);
        }, Rn.xor = Qo, Rn.xorBy = $o, Rn.xorWith = Zo, Rn.zip = Xo, Rn.zipObject = function (e, t) {
          return ii(e || [], t || [], Gn);
        }, Rn.zipObjectDeep = function (e, t) {
          return ii(e || [], t || [], qr);
        }, Rn.zipWith = es, Rn.entries = Ia, Rn.entriesIn = Ra, Rn.extend = ua, Rn.extendWith = ca, Qa(Rn, Rn), Rn.add = al, Rn.attempt = qa, Rn.camelCase = xa, Rn.capitalize = Ma, Rn.ceil = ll, Rn.clamp = function (e, t, n) {
          return void 0 === n && (n = t, t = void 0), void 0 !== n && (n = (n = oa(n)) == n ? n : 0), void 0 !== t && (t = (t = oa(t)) == t ? t : 0), Jn(oa(e), t, n);
        }, Rn.clone = function (e) {
          return Qn(e, 4);
        }, Rn.cloneDeep = function (e) {
          return Qn(e, 5);
        }, Rn.cloneDeepWith = function (e, t) {
          return Qn(e, 5, t = "function" == typeof t ? t : void 0);
        }, Rn.cloneWith = function (e, t) {
          return Qn(e, 4, t = "function" == typeof t ? t : void 0);
        }, Rn.conformsTo = function (e, t) {
          return null == t || $n(e, t, ba(t));
        }, Rn.deburr = Da, Rn.defaultTo = function (e, t) {
          return null == e || e != e ? t : e;
        }, Rn.divide = ul, Rn.endsWith = function (e, t, n) {
          e = aa(e), t = $r(t);var r = e.length,
              i = n = void 0 === n ? r : Jn(ra(n), 0, r);return (n -= t.length) >= 0 && e.slice(n, i) == t;
        }, Rn.eq = ks, Rn.escape = function (e) {
          return (e = aa(e)) && F.test(e) ? e.replace(j, jt) : e;
        }, Rn.escapeRegExp = function (e) {
          return (e = aa(e)) && Y.test(e) ? e.replace(W, "\\$&") : e;
        }, Rn.every = function (e, t, n) {
          var r = Os(e) ? ut : nr;return n && ao(e, t, n) && (t = void 0), r(e, Qi(t, 3));
        }, Rn.find = os, Rn.findIndex = Do, Rn.findKey = function (e, t) {
          return yt(e, Qi(t, 3), lr);
        }, Rn.findLast = ss, Rn.findLastIndex = Oo, Rn.findLastKey = function (e, t) {
          return yt(e, Qi(t, 3), ur);
        }, Rn.floor = cl, Rn.forEach = as, Rn.forEachRight = ls, Rn.forIn = function (e, t) {
          return null == e ? e : sr(e, Qi(t, 3), Ca);
        }, Rn.forInRight = function (e, t) {
          return null == e ? e : ar(e, Qi(t, 3), Ca);
        }, Rn.forOwn = function (e, t) {
          return e && lr(e, Qi(t, 3));
        }, Rn.forOwnRight = function (e, t) {
          return e && ur(e, Qi(t, 3));
        }, Rn.get = ga, Rn.gt = xs, Rn.gte = Ms, Rn.has = function (e, t) {
          return null != e && ro(e, t, gr);
        }, Rn.hasIn = _a, Rn.head = Po, Rn.identity = Wa, Rn.includes = function (e, t, n, r) {
          e = Ps(e) ? e : ka(e), n = n && !r ? ra(n) : 0;var i = e.length;return n < 0 && (n = sn(i + n, 0)), Qs(e) ? n <= i && e.indexOf(t, n) > -1 : !!i && Ct(e, t, n) > -1;
        }, Rn.indexOf = function (e, t, n) {
          var r = null == e ? 0 : e.length;if (!r) return -1;var i = null == n ? 0 : ra(n);return i < 0 && (i = sn(r + i, 0)), Ct(e, t, i);
        }, Rn.inRange = function (e, t, n) {
          return t = na(t), void 0 === n ? (n = t, t = 0) : n = na(n), function (e, t, n) {
            return e >= an(t, n) && e < sn(t, n);
          }(e = oa(e), t, n);
        }, Rn.invoke = ya, Rn.isArguments = Ds, Rn.isArray = Os, Rn.isArrayBuffer = Ls, Rn.isArrayLike = Ps, Rn.isArrayLikeObject = Ns, Rn.isBoolean = function (e) {
          return !0 === e || !1 === e || Vs(e) && fr(e) == c;
        }, Rn.isBuffer = js, Rn.isDate = Us, Rn.isElement = function (e) {
          return Vs(e) && 1 === e.nodeType && !Ys(e);
        }, Rn.isEmpty = function (e) {
          if (null == e) return !0;if (Ps(e) && (Os(e) || "string" == typeof e || "function" == typeof e.splice || js(e) || Zs(e) || Ds(e))) return !e.length;var t = no(e);if (t == g || t == y) return !e.size;if (ho(e)) return !Sr(e).length;for (var n in e) {
            if (Se.call(e, n)) return !1;
          }return !0;
        }, Rn.isEqual = function (e, t) {
          return br(e, t);
        }, Rn.isEqualWith = function (e, t, n) {
          var r = (n = "function" == typeof n ? n : void 0) ? n(e, t) : void 0;return void 0 === r ? br(e, t, void 0, n) : !!r;
        }, Rn.isError = Fs, Rn.isFinite = function (e) {
          return "number" == typeof e && nn(e);
        }, Rn.isFunction = Hs, Rn.isInteger = qs, Rn.isLength = zs, Rn.isMap = Bs, Rn.isMatch = function (e, t) {
          return e === t || Cr(e, t, Zi(t));
        }, Rn.isMatchWith = function (e, t, n) {
          return n = "function" == typeof n ? n : void 0, Cr(e, t, Zi(t), n);
        }, Rn.isNaN = function (e) {
          return Ws(e) && e != +e;
        }, Rn.isNative = function (e) {
          if (co(e)) throw new he("Unsupported core-js use. Try https://npms.io/search?q=ponyfill.");return Tr(e);
        }, Rn.isNil = function (e) {
          return null == e;
        }, Rn.isNull = function (e) {
          return null === e;
        }, Rn.isNumber = Ws, Rn.isObject = Gs, Rn.isObjectLike = Vs, Rn.isPlainObject = Ys, Rn.isRegExp = Ks, Rn.isSafeInteger = function (e) {
          return qs(e) && e >= -9007199254740991 && e <= 9007199254740991;
        }, Rn.isSet = Js, Rn.isString = Qs, Rn.isSymbol = $s, Rn.isTypedArray = Zs, Rn.isUndefined = function (e) {
          return void 0 === e;
        }, Rn.isWeakMap = function (e) {
          return Vs(e) && no(e) == T;
        }, Rn.isWeakSet = function (e) {
          return Vs(e) && "[object WeakSet]" == fr(e);
        }, Rn.join = function (e, t) {
          return null == e ? "" : rn.call(e, t);
        }, Rn.kebabCase = Oa, Rn.last = Fo, Rn.lastIndexOf = function (e, t, n) {
          var r = null == e ? 0 : e.length;if (!r) return -1;var i = r;return void 0 !== n && (i = (i = ra(n)) < 0 ? sn(r + i, 0) : an(i, r - 1)), t == t ? function (e, t, n) {
            for (var r = n + 1; r--;) {
              if (e[r] === t) return r;
            }return r;
          }(e, t, i) : bt(e, wt, i, !0);
        }, Rn.lowerCase = La, Rn.lowerFirst = Pa, Rn.lt = Xs, Rn.lte = ea, Rn.max = function (e) {
          return e && e.length ? rr(e, Wa, pr) : void 0;
        }, Rn.maxBy = function (e, t) {
          return e && e.length ? rr(e, Qi(t, 2), pr) : void 0;
        }, Rn.mean = function (e) {
          return St(e, Wa);
        }, Rn.meanBy = function (e, t) {
          return St(e, Qi(t, 2));
        }, Rn.min = function (e) {
          return e && e.length ? rr(e, Wa, Er) : void 0;
        }, Rn.minBy = function (e, t) {
          return e && e.length ? rr(e, Qi(t, 2), Er) : void 0;
        }, Rn.stubArray = il, Rn.stubFalse = ol, Rn.stubObject = function () {
          return {};
        }, Rn.stubString = function () {
          return "";
        }, Rn.stubTrue = function () {
          return !0;
        }, Rn.multiply = dl, Rn.nth = function (e, t) {
          return e && e.length ? Mr(e, ra(t)) : void 0;
        }, Rn.noConflict = function () {
          return Ye._ === this && (Ye._ = ke), this;
        }, Rn.noop = $a, Rn.now = gs, Rn.pad = function (e, t, n) {
          e = aa(e);var r = (t = ra(t)) ? Bt(e) : 0;if (!t || r >= t) return e;var i = (t - r) / 2;return Di(Xt(i), n) + e + Di(Zt(i), n);
        }, Rn.padEnd = function (e, t, n) {
          e = aa(e);var r = (t = ra(t)) ? Bt(e) : 0;return t && r < t ? e + Di(t - r, n) : e;
        }, Rn.padStart = function (e, t, n) {
          e = aa(e);var r = (t = ra(t)) ? Bt(e) : 0;return t && r < t ? Di(t - r, n) + e : e;
        }, Rn.parseInt = function (e, t, n) {
          return n || null == t ? t = 0 : t && (t = +t), un(aa(e).replace(J, ""), t || 0);
        }, Rn.random = function (e, t, n) {
          if (n && "boolean" != typeof n && ao(e, t, n) && (t = n = void 0), void 0 === n && ("boolean" == typeof t ? (n = t, t = void 0) : "boolean" == typeof e && (n = e, e = void 0)), void 0 === e && void 0 === t ? (e = 0, t = 1) : (e = na(e), void 0 === t ? (t = e, e = 0) : t = na(t)), e > t) {
            var r = e;e = t, t = r;
          }if (n || e % 1 || t % 1) {
            var i = cn();return an(e + i * (t - e + Ge("1e-" + ((i + "").length - 1))), t);
          }return Nr(e, t);
        }, Rn.reduce = function (e, t, n) {
          var r = Os(e) ? gt : It,
              i = arguments.length < 3;return r(e, Qi(t, 4), n, i, er);
        }, Rn.reduceRight = function (e, t, n) {
          var r = Os(e) ? _t : It,
              i = arguments.length < 3;return r(e, Qi(t, 4), n, i, tr);
        }, Rn.repeat = function (e, t, n) {
          return t = (n ? ao(e, t, n) : void 0 === t) ? 1 : ra(t), jr(aa(e), t);
        }, Rn.replace = function () {
          var e = arguments,
              t = aa(e[0]);return e.length < 3 ? t : t.replace(e[1], e[2]);
        }, Rn.result = function (e, t, n) {
          var r = -1,
              i = (t = ai(t, e)).length;for (i || (i = 1, e = void 0); ++r < i;) {
            var o = null == e ? void 0 : e[Eo(t[r])];void 0 === o && (r = i, o = n), e = Hs(o) ? o.call(e) : o;
          }return e;
        }, Rn.round = hl, Rn.runInContext = e, Rn.sample = function (e) {
          return (Os(e) ? Fn : Fr)(e);
        }, Rn.size = function (e) {
          if (null == e) return 0;if (Ps(e)) return Qs(e) ? Bt(e) : e.length;var t = no(e);return t == g || t == y ? e.size : Sr(e).length;
        }, Rn.snakeCase = Na, Rn.some = function (e, t, n) {
          var r = Os(e) ? mt : Wr;return n && ao(e, t, n) && (t = void 0), r(e, Qi(t, 3));
        }, Rn.sortedIndex = function (e, t) {
          return Yr(e, t);
        }, Rn.sortedIndexBy = function (e, t, n) {
          return Kr(e, t, Qi(n, 2));
        }, Rn.sortedIndexOf = function (e, t) {
          var n = null == e ? 0 : e.length;if (n) {
            var r = Yr(e, t);if (r < n && ks(e[r], t)) return r;
          }return -1;
        }, Rn.sortedLastIndex = function (e, t) {
          return Yr(e, t, !0);
        }, Rn.sortedLastIndexBy = function (e, t, n) {
          return Kr(e, t, Qi(n, 2), !0);
        }, Rn.sortedLastIndexOf = function (e, t) {
          if (null != e && e.length) {
            var n = Yr(e, t, !0) - 1;if (ks(e[n], t)) return n;
          }return -1;
        }, Rn.startCase = ja, Rn.startsWith = function (e, t, n) {
          return e = aa(e), n = null == n ? 0 : Jn(ra(n), 0, e.length), t = $r(t), e.slice(n, n + t.length) == t;
        }, Rn.subtract = fl, Rn.sum = function (e) {
          return e && e.length ? Rt(e, Wa) : 0;
        }, Rn.sumBy = function (e, t) {
          return e && e.length ? Rt(e, Qi(t, 2)) : 0;
        }, Rn.template = function (e, t, n) {
          var r = Rn.templateSettings;n && ao(e, t, n) && (t = void 0), e = aa(e), t = ca({}, t, r, Hi);var i,
              o,
              s = ca({}, t.imports, r.imports, Hi),
              a = ba(s),
              l = Mt(s, a),
              u = 0,
              c = t.interpolate || ce,
              d = "__p += '",
              h = _e((t.escape || ce).source + "|" + c.source + "|" + (c === z ? ne : ce).source + "|" + (t.evaluate || ce).source + "|$", "g"),
              f = "//# sourceURL=" + (Se.call(t, "sourceURL") ? (t.sourceURL + "").replace(/[\r\n]/g, " ") : "lodash.templateSources[" + ++Fe + "]") + "\n";e.replace(h, function (t, n, r, s, a, l) {
            return r || (r = s), d += e.slice(u, l).replace(de, Ut), n && (i = !0, d += "' +\n__e(" + n + ") +\n'"), a && (o = !0, d += "';\n" + a + ";\n__p += '"), r && (d += "' +\n((__t = (" + r + ")) == null ? '' : __t) +\n'"), u = l + t.length, t;
          }), d += "';\n";var p = Se.call(t, "variable") && t.variable;p || (d = "with (obj) {\n" + d + "\n}\n"), d = (o ? d.replace(O, "") : d).replace(L, "$1").replace(P, "$1;"), d = "function(" + (p || "obj") + ") {\n" + (p ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (i ? ", __e = _.escape" : "") + (o ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + d + "return __p\n}";var g = qa(function () {
            return fe(a, f + "return " + d).apply(void 0, l);
          });if (g.source = d, Fs(g)) throw g;return g;
        }, Rn.times = function (e, t) {
          if ((e = ra(e)) < 1 || e > 9007199254740991) return [];var n = 4294967295,
              r = an(e, 4294967295);e -= 4294967295;for (var i = kt(r, t = Qi(t)); ++n < e;) {
            t(n);
          }return i;
        }, Rn.toFinite = na, Rn.toInteger = ra, Rn.toLength = ia, Rn.toLower = function (e) {
          return aa(e).toLowerCase();
        }, Rn.toNumber = oa, Rn.toSafeInteger = function (e) {
          return e ? Jn(ra(e), -9007199254740991, 9007199254740991) : 0 === e ? e : 0;
        }, Rn.toString = aa, Rn.toUpper = function (e) {
          return aa(e).toUpperCase();
        }, Rn.trim = function (e, t, n) {
          if ((e = aa(e)) && (n || void 0 === t)) return e.replace(K, "");if (!e || !(t = $r(t))) return e;var r = Wt(e),
              i = Wt(t);return ui(r, Ot(r, i), Lt(r, i) + 1).join("");
        }, Rn.trimEnd = function (e, t, n) {
          if ((e = aa(e)) && (n || void 0 === t)) return e.replace(Q, "");if (!e || !(t = $r(t))) return e;var r = Wt(e);return ui(r, 0, Lt(r, Wt(t)) + 1).join("");
        }, Rn.trimStart = function (e, t, n) {
          if ((e = aa(e)) && (n || void 0 === t)) return e.replace(J, "");if (!e || !(t = $r(t))) return e;var r = Wt(e);return ui(r, Ot(r, Wt(t))).join("");
        }, Rn.truncate = function (e, t) {
          var n = 30,
              r = "...";if (Gs(t)) {
            var i = "separator" in t ? t.separator : i;n = "length" in t ? ra(t.length) : n, r = "omission" in t ? $r(t.omission) : r;
          }var o = (e = aa(e)).length;if (Ft(e)) {
            var s = Wt(e);o = s.length;
          }if (n >= o) return e;var a = n - Bt(r);if (a < 1) return r;var l = s ? ui(s, 0, a).join("") : e.slice(0, a);if (void 0 === i) return l + r;if (s && (a += l.length - a), Ks(i)) {
            if (e.slice(a).search(i)) {
              var u,
                  c = l;for (i.global || (i = _e(i.source, aa(re.exec(i)) + "g")), i.lastIndex = 0; u = i.exec(c);) {
                var d = u.index;
              }l = l.slice(0, void 0 === d ? a : d);
            }
          } else if (e.indexOf($r(i), a) != a) {
            var h = l.lastIndexOf(i);h > -1 && (l = l.slice(0, h));
          }return l + r;
        }, Rn.unescape = function (e) {
          return (e = aa(e)) && U.test(e) ? e.replace(N, Yt) : e;
        }, Rn.uniqueId = function (e) {
          var t = ++Ae;return aa(e) + t;
        }, Rn.upperCase = Ua, Rn.upperFirst = Fa, Rn.each = as, Rn.eachRight = ls, Rn.first = Po, Qa(Rn, (sl = {}, lr(Rn, function (e, t) {
          Se.call(Rn.prototype, t) || (sl[t] = e);
        }), sl), { chain: !1 }), Rn.VERSION = "4.17.15", at(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function (e) {
          Rn[e].placeholder = Rn;
        }), at(["drop", "take"], function (e, t) {
          Dn.prototype[e] = function (n) {
            n = void 0 === n ? 1 : sn(ra(n), 0);var r = this.__filtered__ && !t ? new Dn(this) : this.clone();return r.__filtered__ ? r.__takeCount__ = an(n, r.__takeCount__) : r.__views__.push({ size: an(n, 4294967295), type: e + (r.__dir__ < 0 ? "Right" : "") }), r;
          }, Dn.prototype[e + "Right"] = function (t) {
            return this.reverse()[e](t).reverse();
          };
        }), at(["filter", "map", "takeWhile"], function (e, t) {
          var n = t + 1,
              r = 1 == n || 3 == n;Dn.prototype[e] = function (e) {
            var t = this.clone();return t.__iteratees__.push({ iteratee: Qi(e, 3), type: n }), t.__filtered__ = t.__filtered__ || r, t;
          };
        }), at(["head", "last"], function (e, t) {
          var n = "take" + (t ? "Right" : "");Dn.prototype[e] = function () {
            return this[n](1).value()[0];
          };
        }), at(["initial", "tail"], function (e, t) {
          var n = "drop" + (t ? "" : "Right");Dn.prototype[e] = function () {
            return this.__filtered__ ? new Dn(this) : this[n](1);
          };
        }), Dn.prototype.compact = function () {
          return this.filter(Wa);
        }, Dn.prototype.find = function (e) {
          return this.filter(e).head();
        }, Dn.prototype.findLast = function (e) {
          return this.reverse().find(e);
        }, Dn.prototype.invokeMap = Ur(function (e, t) {
          return "function" == typeof e ? new Dn(this) : this.map(function (n) {
            return vr(n, e, t);
          });
        }), Dn.prototype.reject = function (e) {
          return this.filter(Ss(Qi(e)));
        }, Dn.prototype.slice = function (e, t) {
          e = ra(e);var n = this;return n.__filtered__ && (e > 0 || t < 0) ? new Dn(n) : (e < 0 ? n = n.takeRight(-e) : e && (n = n.drop(e)), void 0 !== t && (n = (t = ra(t)) < 0 ? n.dropRight(-t) : n.take(t - e)), n);
        }, Dn.prototype.takeRightWhile = function (e) {
          return this.reverse().takeWhile(e).reverse();
        }, Dn.prototype.toArray = function () {
          return this.take(4294967295);
        }, lr(Dn.prototype, function (e, t) {
          var n = /^(?:filter|find|map|reject)|While$/.test(t),
              r = /^(?:head|last)$/.test(t),
              i = Rn[r ? "take" + ("last" == t ? "Right" : "") : t],
              o = r || /^find/.test(t);i && (Rn.prototype[t] = function () {
            var t = this.__wrapped__,
                s = r ? [1] : arguments,
                a = t instanceof Dn,
                l = s[0],
                u = a || Os(t),
                c = function c(e) {
              var t = i.apply(Rn, pt([e], s));return r && d ? t[0] : t;
            };u && n && "function" == typeof l && 1 != l.length && (a = u = !1);var d = this.__chain__,
                h = !!this.__actions__.length,
                f = o && !d,
                p = a && !h;if (!o && u) {
              t = p ? t : new Dn(this);var g = e.apply(t, s);return g.__actions__.push({ func: ns, args: [c], thisArg: void 0 }), new Mn(g, d);
            }return f && p ? e.apply(this, s) : (g = this.thru(c), f ? r ? g.value()[0] : g.value() : g);
          });
        }), at(["pop", "push", "shift", "sort", "splice", "unshift"], function (e) {
          var t = ye[e],
              n = /^(?:push|sort|unshift)$/.test(e) ? "tap" : "thru",
              r = /^(?:pop|shift)$/.test(e);Rn.prototype[e] = function () {
            var e = arguments;if (r && !this.__chain__) {
              var i = this.value();return t.apply(Os(i) ? i : [], e);
            }return this[n](function (n) {
              return t.apply(Os(n) ? n : [], e);
            });
          };
        }), lr(Dn.prototype, function (e, t) {
          var n = Rn[t];if (n) {
            var r = n.name + "";Se.call(yn, r) || (yn[r] = []), yn[r].push({ name: t, func: n });
          }
        }), yn[Ri(void 0, 2).name] = [{ name: "wrapper", func: void 0 }], Dn.prototype.clone = function () {
          var e = new Dn(this.__wrapped__);return e.__actions__ = mi(this.__actions__), e.__dir__ = this.__dir__, e.__filtered__ = this.__filtered__, e.__iteratees__ = mi(this.__iteratees__), e.__takeCount__ = this.__takeCount__, e.__views__ = mi(this.__views__), e;
        }, Dn.prototype.reverse = function () {
          if (this.__filtered__) {
            var e = new Dn(this);e.__dir__ = -1, e.__filtered__ = !0;
          } else (e = this.clone()).__dir__ *= -1;return e;
        }, Dn.prototype.value = function () {
          var e = this.__wrapped__.value(),
              t = this.__dir__,
              n = Os(e),
              r = t < 0,
              i = n ? e.length : 0,
              o = function (e, t, n) {
            for (var r = -1, i = n.length; ++r < i;) {
              var o = n[r],
                  s = o.size;switch (o.type) {case "drop":
                  e += s;break;case "dropRight":
                  t -= s;break;case "take":
                  t = an(t, e + s);break;case "takeRight":
                  e = sn(e, t - s);}
            }return { start: e, end: t };
          }(0, i, this.__views__),
              s = o.start,
              a = o.end,
              l = a - s,
              u = r ? a : s - 1,
              c = this.__iteratees__,
              d = c.length,
              h = 0,
              f = an(l, this.__takeCount__);if (!n || !r && i == l && f == l) return ni(e, this.__actions__);var p = [];e: for (; l-- && h < f;) {
            for (var g = -1, _ = e[u += t]; ++g < d;) {
              var m = c[g],
                  v = m.iteratee,
                  y = m.type,
                  b = v(_);if (2 == y) _ = b;else if (!b) {
                if (1 == y) continue e;break e;
              }
            }p[h++] = _;
          }return p;
        }, Rn.prototype.at = rs, Rn.prototype.chain = function () {
          return ts(this);
        }, Rn.prototype.commit = function () {
          return new Mn(this.value(), this.__chain__);
        }, Rn.prototype.next = function () {
          void 0 === this.__values__ && (this.__values__ = ta(this.value()));var e = this.__index__ >= this.__values__.length;return { done: e, value: e ? void 0 : this.__values__[this.__index__++] };
        }, Rn.prototype.plant = function (e) {
          for (var t, n = this; n instanceof xn;) {
            var r = Ro(n);r.__index__ = 0, r.__values__ = void 0, t ? i.__wrapped__ = r : t = r;var i = r;n = n.__wrapped__;
          }return i.__wrapped__ = e, t;
        }, Rn.prototype.reverse = function () {
          var e = this.__wrapped__;if (e instanceof Dn) {
            var t = e;return this.__actions__.length && (t = new Dn(this)), (t = t.reverse()).__actions__.push({ func: ns, args: [Go], thisArg: void 0 }), new Mn(t, this.__chain__);
          }return this.thru(Go);
        }, Rn.prototype.toJSON = Rn.prototype.valueOf = Rn.prototype.value = function () {
          return ni(this.__wrapped__, this.__actions__);
        }, Rn.prototype.first = Rn.prototype.head, Ze && (Rn.prototype[Ze] = function () {
          return this;
        }), Rn;
      }();Ye._ = Kt, void 0 === (i = function () {
        return Kt;
      }.call(t, n, t, r)) || (r.exports = i);
    }).call(this);
  }).call(this, n(28), n(29)(e));
}, function (e, t) {
  var n,
      r,
      i = e.exports = {};function o() {
    throw new Error("setTimeout has not been defined");
  }function s() {
    throw new Error("clearTimeout has not been defined");
  }function a(e) {
    if (n === setTimeout) return setTimeout(e, 0);if ((n === o || !n) && setTimeout) return n = setTimeout, setTimeout(e, 0);try {
      return n(e, 0);
    } catch (t) {
      try {
        return n.call(null, e, 0);
      } catch (t) {
        return n.call(this, e, 0);
      }
    }
  }!function () {
    try {
      n = "function" == typeof setTimeout ? setTimeout : o;
    } catch (e) {
      n = o;
    }try {
      r = "function" == typeof clearTimeout ? clearTimeout : s;
    } catch (e) {
      r = s;
    }
  }();var l,
      u = [],
      c = !1,
      d = -1;function h() {
    c && l && (c = !1, l.length ? u = l.concat(u) : d = -1, u.length && f());
  }function f() {
    if (!c) {
      var e = a(h);c = !0;for (var t = u.length; t;) {
        for (l = u, u = []; ++d < t;) {
          l && l[d].run();
        }d = -1, t = u.length;
      }l = null, c = !1, function (e) {
        if (r === clearTimeout) return clearTimeout(e);if ((r === s || !r) && clearTimeout) return r = clearTimeout, clearTimeout(e);try {
          r(e);
        } catch (t) {
          try {
            return r.call(null, e);
          } catch (t) {
            return r.call(this, e);
          }
        }
      }(e);
    }
  }function p(e, t) {
    this.fun = e, this.array = t;
  }function g() {}i.nextTick = function (e) {
    var t = new Array(arguments.length - 1);if (arguments.length > 1) for (var n = 1; n < arguments.length; n++) {
      t[n - 1] = arguments[n];
    }u.push(new p(e, t)), 1 !== u.length || c || a(f);
  }, p.prototype.run = function () {
    this.fun.apply(null, this.array);
  }, i.title = "browser", i.browser = !0, i.env = {}, i.argv = [], i.version = "", i.versions = {}, i.on = g, i.addListener = g, i.once = g, i.off = g, i.removeListener = g, i.removeAllListeners = g, i.emit = g, i.prependListener = g, i.prependOnceListener = g, i.listeners = function (e) {
    return [];
  }, i.binding = function (e) {
    throw new Error("process.binding is not supported");
  }, i.cwd = function () {
    return "/";
  }, i.chdir = function (e) {
    throw new Error("process.chdir is not supported");
  }, i.umask = function () {
    return 0;
  };
}, function (e) {
  e.exports = JSON.parse('{"name":"jssip","title":"JsSIP","description":"the Javascript SIP library","version":"3.9.1","homepage":"https://jssip.net","contributors":["José Luis Millán <jmillan@aliax.net> (https://github.com/jmillan)","Iñaki Baz Castillo <ibc@aliax.net> (https://inakibaz.me)"],"types":"lib/JsSIP.d.ts","main":"lib-es5/JsSIP.js","keywords":["sip","websocket","webrtc","node","browser","library"],"license":"MIT","repository":{"type":"git","url":"https://github.com/versatica/JsSIP.git"},"bugs":{"url":"https://github.com/versatica/JsSIP/issues"},"dependencies":{"@types/debug":"^4.1.5","@types/node":"^14.14.34","debug":"^4.3.1","events":"^3.3.0","sdp-transform":"^2.14.1"},"devDependencies":{"@babel/core":"^7.13.10","@babel/preset-env":"^7.13.10","ansi-colors":"^3.2.4","browserify":"^16.5.1","eslint":"^5.16.0","fancy-log":"^1.3.3","gulp":"^4.0.2","gulp-babel":"^8.0.0","gulp-eslint":"^5.0.0","gulp-expect-file":"^1.0.2","gulp-header":"^2.0.9","gulp-nodeunit-runner":"^0.2.2","gulp-plumber":"^1.2.1","gulp-rename":"^1.4.0","gulp-uglify-es":"^1.0.4","pegjs":"^0.7.0","vinyl-buffer":"^1.0.1","vinyl-source-stream":"^2.0.0"},"scripts":{"lint":"gulp lint","test":"gulp test","prepublishOnly":"gulp babel"}}');
}, function (e, t, n) {
  var r = n(34),
      i = n(35);t.write = i, t.parse = r.parse, t.parseParams = r.parseParams, t.parseFmtpConfig = r.parseFmtpConfig, t.parsePayloads = r.parsePayloads, t.parseRemoteCandidates = r.parseRemoteCandidates, t.parseImageAttributes = r.parseImageAttributes, t.parseSimulcastStreamList = r.parseSimulcastStreamList;
}, function (e, t) {
  var n = e.exports = { v: [{ name: "version", reg: /^(\d*)$/ }], o: [{ name: "origin", reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/, names: ["username", "sessionId", "sessionVersion", "netType", "ipVer", "address"], format: "%s %s %d %s IP%d %s" }], s: [{ name: "name" }], i: [{ name: "description" }], u: [{ name: "uri" }], e: [{ name: "email" }], p: [{ name: "phone" }], z: [{ name: "timezones" }], r: [{ name: "repeats" }], t: [{ name: "timing", reg: /^(\d*) (\d*)/, names: ["start", "stop"], format: "%d %d" }], c: [{ name: "connection", reg: /^IN IP(\d) (\S*)/, names: ["version", "ip"], format: "IN IP%d %s" }], b: [{ push: "bandwidth", reg: /^(TIAS|AS|CT|RR|RS):(\d*)/, names: ["type", "limit"], format: "%s:%s" }], m: [{ reg: /^(\w*) (\d*) ([\w/]*)(?: (.*))?/, names: ["type", "port", "protocol", "payloads"], format: "%s %d %s %s" }], a: [{ push: "rtp", reg: /^rtpmap:(\d*) ([\w\-.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/, names: ["payload", "codec", "rate", "encoding"], format: function format(e) {
        return e.encoding ? "rtpmap:%d %s/%s/%s" : e.rate ? "rtpmap:%d %s/%s" : "rtpmap:%d %s";
      } }, { push: "fmtp", reg: /^fmtp:(\d*) ([\S| ]*)/, names: ["payload", "config"], format: "fmtp:%d %s" }, { name: "control", reg: /^control:(.*)/, format: "control:%s" }, { name: "rtcp", reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/, names: ["port", "netType", "ipVer", "address"], format: function format(e) {
        return null != e.address ? "rtcp:%d %s IP%d %s" : "rtcp:%d";
      } }, { push: "rtcpFbTrrInt", reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/, names: ["payload", "value"], format: "rtcp-fb:%s trr-int %d" }, { push: "rtcpFb", reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/, names: ["payload", "type", "subtype"], format: function format(e) {
        return null != e.subtype ? "rtcp-fb:%s %s %s" : "rtcp-fb:%s %s";
      } }, { push: "ext", reg: /^extmap:(\d+)(?:\/(\w+))?(?: (urn:ietf:params:rtp-hdrext:encrypt))? (\S*)(?: (\S*))?/, names: ["value", "direction", "encrypt-uri", "uri", "config"], format: function format(e) {
        return "extmap:%d" + (e.direction ? "/%s" : "%v") + (e["encrypt-uri"] ? " %s" : "%v") + " %s" + (e.config ? " %s" : "");
      } }, { name: "extmapAllowMixed", reg: /^(extmap-allow-mixed)/ }, { push: "crypto", reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/, names: ["id", "suite", "config", "sessionConfig"], format: function format(e) {
        return null != e.sessionConfig ? "crypto:%d %s %s %s" : "crypto:%d %s %s";
      } }, { name: "setup", reg: /^setup:(\w*)/, format: "setup:%s" }, { name: "connectionType", reg: /^connection:(new|existing)/, format: "connection:%s" }, { name: "mid", reg: /^mid:([^\s]*)/, format: "mid:%s" }, { name: "msid", reg: /^msid:(.*)/, format: "msid:%s" }, { name: "ptime", reg: /^ptime:(\d*(?:\.\d*)*)/, format: "ptime:%d" }, { name: "maxptime", reg: /^maxptime:(\d*(?:\.\d*)*)/, format: "maxptime:%d" }, { name: "direction", reg: /^(sendrecv|recvonly|sendonly|inactive)/ }, { name: "icelite", reg: /^(ice-lite)/ }, { name: "iceUfrag", reg: /^ice-ufrag:(\S*)/, format: "ice-ufrag:%s" }, { name: "icePwd", reg: /^ice-pwd:(\S*)/, format: "ice-pwd:%s" }, { name: "fingerprint", reg: /^fingerprint:(\S*) (\S*)/, names: ["type", "hash"], format: "fingerprint:%s %s" }, { push: "candidates", reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/, names: ["foundation", "component", "transport", "priority", "ip", "port", "type", "raddr", "rport", "tcptype", "generation", "network-id", "network-cost"], format: function format(e) {
        var t = "candidate:%s %d %s %d %s %d typ %s";return t += null != e.raddr ? " raddr %s rport %d" : "%v%v", t += null != e.tcptype ? " tcptype %s" : "%v", null != e.generation && (t += " generation %d"), t += null != e["network-id"] ? " network-id %d" : "%v", t + (null != e["network-cost"] ? " network-cost %d" : "%v");
      } }, { name: "endOfCandidates", reg: /^(end-of-candidates)/ }, { name: "remoteCandidates", reg: /^remote-candidates:(.*)/, format: "remote-candidates:%s" }, { name: "iceOptions", reg: /^ice-options:(\S*)/, format: "ice-options:%s" }, { push: "ssrcs", reg: /^ssrc:(\d*) ([\w_-]*)(?::(.*))?/, names: ["id", "attribute", "value"], format: function format(e) {
        var t = "ssrc:%d";return null != e.attribute && (t += " %s", null != e.value && (t += ":%s")), t;
      } }, { push: "ssrcGroups", reg: /^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/, names: ["semantics", "ssrcs"], format: "ssrc-group:%s %s" }, { name: "msidSemantic", reg: /^msid-semantic:\s?(\w*) (\S*)/, names: ["semantic", "token"], format: "msid-semantic: %s %s" }, { push: "groups", reg: /^group:(\w*) (.*)/, names: ["type", "mids"], format: "group:%s %s" }, { name: "rtcpMux", reg: /^(rtcp-mux)/ }, { name: "rtcpRsize", reg: /^(rtcp-rsize)/ }, { name: "sctpmap", reg: /^sctpmap:([\w_/]*) (\S*)(?: (\S*))?/, names: ["sctpmapNumber", "app", "maxMessageSize"], format: function format(e) {
        return null != e.maxMessageSize ? "sctpmap:%s %s %s" : "sctpmap:%s %s";
      } }, { name: "xGoogleFlag", reg: /^x-google-flag:([^\s]*)/, format: "x-google-flag:%s" }, { push: "rids", reg: /^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/, names: ["id", "direction", "params"], format: function format(e) {
        return e.params ? "rid:%s %s %s" : "rid:%s %s";
      } }, { push: "imageattrs", reg: new RegExp("^imageattr:(\\d+|\\*)[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?"), names: ["pt", "dir1", "attrs1", "dir2", "attrs2"], format: function format(e) {
        return "imageattr:%s %s %s" + (e.dir2 ? " %s %s" : "");
      } }, { name: "simulcast", reg: new RegExp("^simulcast:(send|recv) ([a-zA-Z0-9\\-_~;,]+)(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?$"), names: ["dir1", "list1", "dir2", "list2"], format: function format(e) {
        return "simulcast:%s %s" + (e.dir2 ? " %s %s" : "");
      } }, { name: "simulcast_03", reg: /^simulcast:[\s\t]+([\S+\s\t]+)$/, names: ["value"], format: "simulcast: %s" }, { name: "framerate", reg: /^framerate:(\d+(?:$|\.\d+))/, format: "framerate:%s" }, { name: "sourceFilter", reg: /^source-filter: *(excl|incl) (\S*) (IP4|IP6|\*) (\S*) (.*)/, names: ["filterMode", "netType", "addressTypes", "destAddress", "srcList"], format: "source-filter: %s %s %s %s %s" }, { name: "bundleOnly", reg: /^(bundle-only)/ }, { name: "label", reg: /^label:(.+)/, format: "label:%s" }, { name: "sctpPort", reg: /^sctp-port:(\d+)$/, format: "sctp-port:%s" }, { name: "maxMessageSize", reg: /^max-message-size:(\d+)$/, format: "max-message-size:%s" }, { push: "tsRefClocks", reg: /^ts-refclk:([^\s=]*)(?:=(\S*))?/, names: ["clksrc", "clksrcExt"], format: function format(e) {
        return "ts-refclk:%s" + (null != e.clksrcExt ? "=%s" : "");
      } }, { name: "mediaClk", reg: /^mediaclk:(?:id=(\S*))? *([^\s=]*)(?:=(\S*))?(?: *rate=(\d+)\/(\d+))?/, names: ["id", "mediaClockName", "mediaClockValue", "rateNumerator", "rateDenominator"], format: function format(e) {
        var t = "mediaclk:";return t += null != e.id ? "id=%s %s" : "%v%s", t += null != e.mediaClockValue ? "=%s" : "", t += null != e.rateNumerator ? " rate=%s" : "", t + (null != e.rateDenominator ? "/%s" : "");
      } }, { name: "keywords", reg: /^keywds:(.+)$/, format: "keywds:%s" }, { name: "content", reg: /^content:(.+)/, format: "content:%s" }, { name: "bfcpFloorCtrl", reg: /^floorctrl:(c-only|s-only|c-s)/, format: "floorctrl:%s" }, { name: "bfcpConfId", reg: /^confid:(\d+)/, format: "confid:%s" }, { name: "bfcpUserId", reg: /^userid:(\d+)/, format: "userid:%s" }, { name: "bfcpFloorId", reg: /^floorid:(.+) (?:m-stream|mstrm):(.+)/, names: ["id", "mStream"], format: "floorid:%s mstrm:%s" }, { push: "invalid", names: ["value"] }] };Object.keys(n).forEach(function (e) {
    n[e].forEach(function (e) {
      e.reg || (e.reg = /(.*)/), e.format || (e.format = "%s");
    });
  });
}, function (e, t, n) {
  "use strict";
  var r = 500;e.exports = { T1: r, T2: 4e3, T4: 5e3, TIMER_B: 32e3, TIMER_D: 0, TIMER_F: 32e3, TIMER_H: 32e3, TIMER_I: 0, TIMER_J: 0, TIMER_K: 0, TIMER_L: 32e3, TIMER_M: 32e3, PROVISIONAL_RESPONSE_INTERVAL: 6e4 };
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    var _n5;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n5 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return o(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? o(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n5 && (e = _n5);var r = 0,
            i = function i() {};return { s: i, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e8) {
            throw _e8;
          }, f: i };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var s,
        a = !0,
        l = !1;return { s: function s() {
        _n5 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n5.next();return a = e.done, e;
      }, e: function e(_e9) {
        l = !0, s = _e9;
      }, f: function f() {
        try {
          a || null == _n5.return || _n5.return();
        } finally {
          if (l) throw s;
        }
      } };
  }function o(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }function s(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function a(e, t, n) {
    return t && s(e.prototype, t), n && s(e, n), e;
  }function l(e, t) {
    return (l = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function u(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = d(e);if (t) {
        var i = d(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return c(this, n);
    };
  }function c(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function d(e) {
    return (d = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var h = n(7).EventEmitter,
      f = n(17),
      p = n(1),
      g = n(0),
      _ = n(5),
      m = n(10),
      v = n(2),
      y = n(19),
      b = n(4),
      C = n(37),
      T = n(9),
      w = n(39),
      S = n(40),
      A = n(41),
      E = n(42),
      I = n(6),
      R = new p("RTCSession"),
      k = { STATUS_NULL: 0, STATUS_INVITE_SENT: 1, STATUS_1XX_RECEIVED: 2, STATUS_INVITE_RECEIVED: 3, STATUS_WAITING_FOR_ANSWER: 4, STATUS_ANSWERED: 5, STATUS_WAITING_FOR_ACK: 6, STATUS_CANCELED: 7, STATUS_TERMINATED: 8, STATUS_CONFIRMED: 9 },
      x = ["audio", "video"];e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && l(e, t);
    }(n, e);var t = u(n);function n(e) {
      var r;return function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, n), R.debug("new"), (r = t.call(this))._id = null, r._ua = e, r._status = k.STATUS_NULL, r._dialog = null, r._earlyDialogs = {}, r._contact = null, r._from_tag = null, r._to_tag = null, r._connection = null, r._connectionPromiseQueue = Promise.resolve(), r._request = null, r._is_canceled = !1, r._cancel_reason = "", r._is_confirmed = !1, r._late_sdp = !1, r._rtcOfferConstraints = null, r._rtcAnswerConstraints = null, r._localMediaStream = null, r._localMediaStreamLocallyGenerated = !1, r._rtcReady = !0, r._iceReady = !1, r._timers = { ackTimer: null, expiresTimer: null, invite2xxTimer: null, userNoAnswerTimer: null }, r._direction = null, r._local_identity = null, r._remote_identity = null, r._start_time = null, r._end_time = null, r._tones = null, r._audioMuted = !1, r._videoMuted = !1, r._localHold = !1, r._remoteHold = !1, r._sessionTimers = { enabled: r._ua.configuration.session_timers, refreshMethod: r._ua.configuration.session_timers_refresh_method, defaultExpires: g.SESSION_EXPIRES, currentExpires: null, running: !1, refresher: !1, timer: null }, r._referSubscribers = {}, r._data = {}, r;
    }return a(n, null, [{ key: "C", get: function get() {
        return k;
      } }]), a(n, [{ key: "isInProgress", value: function value() {
        switch (this._status) {case k.STATUS_NULL:case k.STATUS_INVITE_SENT:case k.STATUS_1XX_RECEIVED:case k.STATUS_INVITE_RECEIVED:case k.STATUS_WAITING_FOR_ANSWER:
            return !0;default:
            return !1;}
      } }, { key: "isEstablished", value: function value() {
        switch (this._status) {case k.STATUS_ANSWERED:case k.STATUS_WAITING_FOR_ACK:case k.STATUS_CONFIRMED:
            return !0;default:
            return !1;}
      } }, { key: "isEnded", value: function value() {
        switch (this._status) {case k.STATUS_CANCELED:case k.STATUS_TERMINATED:
            return !0;default:
            return !1;}
      } }, { key: "isMuted", value: function value() {
        return { audio: this._audioMuted, video: this._videoMuted };
      } }, { key: "isOnHold", value: function value() {
        return { local: this._localHold, remote: this._remoteHold };
      } }, { key: "connect", value: function value(e) {
        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
            n = arguments.length > 2 ? arguments[2] : void 0;R.debug("connect()");var r = e,
            i = v.cloneObject(t.eventHandlers),
            o = v.cloneArray(t.extraHeaders),
            s = v.cloneObject(t.mediaConstraints, { audio: !0, video: !0 }),
            a = t.mediaStream || null,
            l = v.cloneObject(t.pcConfig, { iceServers: [] }),
            u = t.rtcConstraints || null,
            c = t.rtcOfferConstraints || null;if (this._rtcOfferConstraints = c, this._rtcAnswerConstraints = t.rtcAnswerConstraints || null, this._data = t.data || this._data, void 0 === e) throw new TypeError("Not enough arguments");if (this._status !== k.STATUS_NULL) throw new _.InvalidStateError(this._status);if (!window.RTCPeerConnection) throw new _.NotSupportedError("WebRTC not supported");if (!(e = this._ua.normalizeTarget(e))) throw new TypeError("Invalid target: ".concat(r));for (var d in this._sessionTimers.enabled && v.isDecimal(t.sessionTimersExpires) && (t.sessionTimersExpires >= g.MIN_SESSION_EXPIRES ? this._sessionTimers.defaultExpires = t.sessionTimersExpires : this._sessionTimers.defaultExpires = g.SESSION_EXPIRES), i) {
          Object.prototype.hasOwnProperty.call(i, d) && this.on(d, i[d]);
        }this._from_tag = v.newTag();var h = t.anonymous || !1,
            f = { from_tag: this._from_tag };this._contact = this._ua.contact.toString({ anonymous: h, outbound: !0 }), h ? (f.from_display_name = "Anonymous", f.from_uri = new I("sip", "anonymous", "anonymous.invalid"), o.push("P-Preferred-Identity: ".concat(this._ua.configuration.uri.toString())), o.push("Privacy: id")) : t.fromUserName && (f.from_uri = new I("sip", t.fromUserName, this._ua.configuration.uri.host), o.push("P-Preferred-Identity: ".concat(this._ua.configuration.uri.toString()))), t.fromDisplayName && (f.from_display_name = t.fromDisplayName), o.push("Contact: ".concat(this._contact)), o.push("Content-Type: application/sdp"), this._sessionTimers.enabled && o.push("Session-Expires: ".concat(this._sessionTimers.defaultExpires).concat(this._ua.configuration.session_timers_force_refresher ? ";refresher=uac" : "")), this._request = new b.InitialOutgoingInviteRequest(e, this._ua, f, o), this._id = this._request.call_id + this._from_tag, this._createRTCConnection(l, u), this._direction = "outgoing", this._local_identity = this._request.from, this._remote_identity = this._request.to, n && n(this), this._newRTCSession("local", this._request), this._sendInitialRequest(s, c, a);
      } }, { key: "init_incoming", value: function value(e, t) {
        var n,
            r = this;R.debug("init_incoming()");var i = e.hasHeader("Content-Type") ? e.getHeader("Content-Type").toLowerCase() : void 0;e.body && "application/sdp" !== i ? e.reply(415) : (this._status = k.STATUS_INVITE_RECEIVED, this._from_tag = e.from_tag, this._id = e.call_id + this._from_tag, this._request = e, this._contact = this._ua.contact.toString(), e.hasHeader("expires") && (n = 1e3 * e.getHeader("expires")), e.to_tag = v.newTag(), this._createDialog(e, "UAS", !0) ? (e.body ? this._late_sdp = !1 : this._late_sdp = !0, this._status = k.STATUS_WAITING_FOR_ANSWER, this._timers.userNoAnswerTimer = setTimeout(function () {
          e.reply(408), r._failed("local", null, g.causes.NO_ANSWER);
        }, this._ua.configuration.no_answer_timeout), n && (this._timers.expiresTimer = setTimeout(function () {
          r._status === k.STATUS_WAITING_FOR_ANSWER && (e.reply(487), r._failed("system", null, g.causes.EXPIRES));
        }, n)), this._direction = "incoming", this._local_identity = e.to, this._remote_identity = e.from, t && t(this), this._newRTCSession("remote", e), this._status !== k.STATUS_TERMINATED && (e.reply(180, null, ["Contact: ".concat(this._contact)]), this._progress("local", null))) : e.reply(500, "Missing Contact header field"));
      } }, { key: "answer", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};R.debug("answer()");var n = this._request,
            r = v.cloneArray(t.extraHeaders),
            o = v.cloneObject(t.mediaConstraints),
            s = t.mediaStream || null,
            a = v.cloneObject(t.pcConfig, { iceServers: [] }),
            l = t.rtcConstraints || null,
            u = t.rtcAnswerConstraints || null,
            c = v.cloneObject(t.rtcOfferConstraints),
            d = !1,
            h = !1,
            f = !1,
            p = !1;if (this._rtcAnswerConstraints = u, this._rtcOfferConstraints = t.rtcOfferConstraints || null, this._data = t.data || this._data, "incoming" !== this._direction) throw new _.NotSupportedError('"answer" not supported for outgoing RTCSession');if (this._status !== k.STATUS_WAITING_FOR_ANSWER) throw new _.InvalidStateError(this._status);if (this._sessionTimers.enabled && v.isDecimal(t.sessionTimersExpires) && (t.sessionTimersExpires >= g.MIN_SESSION_EXPIRES ? this._sessionTimers.defaultExpires = t.sessionTimersExpires : this._sessionTimers.defaultExpires = g.SESSION_EXPIRES), this._status = k.STATUS_ANSWERED, this._createDialog(n, "UAS")) {
          clearTimeout(this._timers.userNoAnswerTimer), r.unshift("Contact: ".concat(this._contact));var m = n.parseSDP();Array.isArray(m.media) || (m.media = [m.media]);var y,
              b = i(m.media);try {
            for (b.s(); !(y = b.n()).done;) {
              var C = y.value;"audio" === C.type && (d = !0, C.direction && "sendrecv" !== C.direction || (f = !0)), "video" === C.type && (h = !0, C.direction && "sendrecv" !== C.direction || (p = !0));
            }
          } catch (e) {
            b.e(e);
          } finally {
            b.f();
          }if (s && !1 === o.audio) {
            var T,
                w = i(s.getAudioTracks());try {
              for (w.s(); !(T = w.n()).done;) {
                var S = T.value;s.removeTrack(S);
              }
            } catch (e) {
              w.e(e);
            } finally {
              w.f();
            }
          }if (s && !1 === o.video) {
            var A,
                E = i(s.getVideoTracks());try {
              for (E.s(); !(A = E.n()).done;) {
                var I = A.value;s.removeTrack(I);
              }
            } catch (e) {
              E.e(e);
            } finally {
              E.f();
            }
          }s || void 0 !== o.audio || (o.audio = f), s || void 0 !== o.video || (o.video = p), s || d || c.offerToReceiveAudio || (o.audio = !1), s || h || c.offerToReceiveVideo || (o.video = !1), this._createRTCConnection(a, l), Promise.resolve().then(function () {
            return s || (o.audio || o.video ? (e._localMediaStreamLocallyGenerated = !0, navigator.mediaDevices.getUserMedia(o).catch(function (t) {
              if (e._status === k.STATUS_TERMINATED) throw new Error("terminated");throw n.reply(480), e._failed("local", null, g.causes.USER_DENIED_MEDIA_ACCESS), R.warn('emit "getusermediafailed" [error:%o]', t), e.emit("getusermediafailed", t), new Error("getUserMedia() failed");
            })) : void 0);
          }).then(function (t) {
            if (e._status === k.STATUS_TERMINATED) throw new Error("terminated");e._localMediaStream = t, t && t.getTracks().forEach(function (n) {
              e._connection.addTrack(n, t);
            });
          }).then(function () {
            if (!e._late_sdp) {
              var t = { originator: "remote", type: "offer", sdp: n.body };R.debug('emit "sdp"'), e.emit("sdp", t);var r = new RTCSessionDescription({ type: "offer", sdp: t.sdp });return e._connectionPromiseQueue = e._connectionPromiseQueue.then(function () {
                return e._connection.setRemoteDescription(r);
              }).catch(function (t) {
                throw n.reply(488), e._failed("system", null, g.causes.WEBRTC_ERROR), R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', t), e.emit("peerconnection:setremotedescriptionfailed", t), new Error("peerconnection.setRemoteDescription() failed");
              }), e._connectionPromiseQueue;
            }
          }).then(function () {
            if (e._status === k.STATUS_TERMINATED) throw new Error("terminated");return e._connecting(n), e._late_sdp ? e._createLocalDescription("offer", e._rtcOfferConstraints).catch(function () {
              throw n.reply(500), new Error("_createLocalDescription() failed");
            }) : e._createLocalDescription("answer", u).catch(function () {
              throw n.reply(500), new Error("_createLocalDescription() failed");
            });
          }).then(function (t) {
            if (e._status === k.STATUS_TERMINATED) throw new Error("terminated");e._handleSessionTimersInIncomingRequest(n, r), n.reply(200, null, r, t, function () {
              e._status = k.STATUS_WAITING_FOR_ACK, e._setInvite2xxTimer(n, t), e._setACKTimer(), e._accepted("local");
            }, function () {
              e._failed("system", null, g.causes.CONNECTION_ERROR);
            });
          }).catch(function (t) {
            e._status !== k.STATUS_TERMINATED && R.warn(t);
          });
        } else n.reply(500, "Error creating dialog");
      } }, { key: "terminate", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};R.debug("terminate()");var n,
            r = t.cause || g.causes.BYE,
            i = v.cloneArray(t.extraHeaders),
            o = t.body,
            s = t.status_code,
            a = t.reason_phrase;if (this._status === k.STATUS_TERMINATED) throw new _.InvalidStateError(this._status);switch (this._status) {case k.STATUS_NULL:case k.STATUS_INVITE_SENT:case k.STATUS_1XX_RECEIVED:
            if (R.debug("canceling session"), s && (s < 200 || s >= 700)) throw new TypeError("Invalid status_code: ".concat(s));s && (a = a || g.REASON_PHRASE[s] || "", n = "SIP ;cause=".concat(s, ' ;text="').concat(a, '"')), this._status === k.STATUS_NULL || this._status === k.STATUS_INVITE_SENT ? (this._is_canceled = !0, this._cancel_reason = n) : this._status === k.STATUS_1XX_RECEIVED && this._request.cancel(n), this._status = k.STATUS_CANCELED, this._failed("local", null, g.causes.CANCELED);break;case k.STATUS_WAITING_FOR_ANSWER:case k.STATUS_ANSWERED:
            if (R.debug("rejecting session"), (s = s || 480) < 300 || s >= 700) throw new TypeError("Invalid status_code: ".concat(s));this._request.reply(s, a, i, o), this._failed("local", null, g.causes.REJECTED);break;case k.STATUS_WAITING_FOR_ACK:case k.STATUS_CONFIRMED:
            if (R.debug("terminating session"), a = t.reason_phrase || g.REASON_PHRASE[s] || "", s && (s < 200 || s >= 700)) throw new TypeError("Invalid status_code: ".concat(s));if (s && i.push("Reason: SIP ;cause=".concat(s, '; text="').concat(a, '"')), this._status === k.STATUS_WAITING_FOR_ACK && "incoming" === this._direction && this._request.server_transaction.state !== m.C.STATUS_TERMINATED) {
              var l = this._dialog;this.receiveRequest = function (t) {
                t.method === g.ACK && (e.sendRequest(g.BYE, { extraHeaders: i, body: o }), l.terminate());
              }, this._request.server_transaction.on("stateChanged", function () {
                e._request.server_transaction.state === m.C.STATUS_TERMINATED && (e.sendRequest(g.BYE, { extraHeaders: i, body: o }), l.terminate());
              }), this._ended("local", null, r), this._dialog = l, this._ua.newDialog(l);
            } else this.sendRequest(g.BYE, { extraHeaders: i, body: o }), this._ended("local", null, r);}
      } }, { key: "sendDTMF", value: function value(e) {
        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};R.debug("sendDTMF() | tones: %s", e);var n = 0,
            r = t.duration || null,
            i = t.interToneGap || null,
            o = t.transportType || g.DTMF_TRANSPORT.INFO;if (void 0 === e) throw new TypeError("Not enough arguments");if (this._status !== k.STATUS_CONFIRMED && this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_1XX_RECEIVED) throw new _.InvalidStateError(this._status);if (o !== g.DTMF_TRANSPORT.INFO && o !== g.DTMF_TRANSPORT.RFC2833) throw new TypeError("invalid transportType: ".concat(o));if ("number" == typeof e && (e = e.toString()), !e || "string" != typeof e || !e.match(/^[0-9A-DR#*,]+$/i)) throw new TypeError("Invalid tones: ".concat(e));if (r && !v.isDecimal(r)) throw new TypeError("Invalid tone duration: ".concat(r));if (r ? r < w.C.MIN_DURATION ? (R.debug('"duration" value is lower than the minimum allowed, setting it to '.concat(w.C.MIN_DURATION, " milliseconds")), r = w.C.MIN_DURATION) : r > w.C.MAX_DURATION ? (R.debug('"duration" value is greater than the maximum allowed, setting it to '.concat(w.C.MAX_DURATION, " milliseconds")), r = w.C.MAX_DURATION) : r = Math.abs(r) : r = w.C.DEFAULT_DURATION, t.duration = r, i && !v.isDecimal(i)) throw new TypeError("Invalid interToneGap: ".concat(i));if (i ? i < w.C.MIN_INTER_TONE_GAP ? (R.debug('"interToneGap" value is lower than the minimum allowed, setting it to '.concat(w.C.MIN_INTER_TONE_GAP, " milliseconds")), i = w.C.MIN_INTER_TONE_GAP) : i = Math.abs(i) : i = w.C.DEFAULT_INTER_TONE_GAP, o !== g.DTMF_TRANSPORT.RFC2833) this._tones ? this._tones += e : (this._tones = e, a.call(this));else {
          var s = this._getDTMFRTPSender();s && (e = s.toneBuffer + e, s.insertDTMF(e, r, i));
        }function a() {
          var e,
              o = this;if (this._status === k.STATUS_TERMINATED || !this._tones || n >= this._tones.length) this._tones = null;else {
            var s = this._tones[n];if (n += 1, "," === s) e = 2e3;else {
              var l = new w(this);t.eventHandlers = { onFailed: function onFailed() {
                  o._tones = null;
                } }, l.send(s, t), e = r + i;
            }setTimeout(a.bind(this), e);
          }
        }
      } }, { key: "sendInfo", value: function value(e, t) {
        var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};if (R.debug("sendInfo()"), this._status !== k.STATUS_CONFIRMED && this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_1XX_RECEIVED) throw new _.InvalidStateError(this._status);var r = new S(this);r.send(e, t, n);
      } }, { key: "mute", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : { audio: !0, video: !1 };R.debug("mute()");var t = !1,
            n = !1;!1 === this._audioMuted && e.audio && (t = !0, this._audioMuted = !0, this._toggleMuteAudio(!0)), !1 === this._videoMuted && e.video && (n = !0, this._videoMuted = !0, this._toggleMuteVideo(!0)), !0 !== t && !0 !== n || this._onmute({ audio: t, video: n });
      } }, { key: "unmute", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : { audio: !0, video: !0 };R.debug("unmute()");var t = !1,
            n = !1;!0 === this._audioMuted && e.audio && (t = !0, this._audioMuted = !1, !1 === this._localHold && this._toggleMuteAudio(!1)), !0 === this._videoMuted && e.video && (n = !0, this._videoMuted = !1, !1 === this._localHold && this._toggleMuteVideo(!1)), !0 !== t && !0 !== n || this._onunmute({ audio: t, video: n });
      } }, { key: "hold", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            n = arguments.length > 1 ? arguments[1] : void 0;if (R.debug("hold()"), this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_CONFIRMED) return !1;if (!0 === this._localHold) return !1;if (!this._isReadyToReOffer()) return !1;this._localHold = !0, this._onhold("local");var r = { succeeded: function succeeded() {
            n && n();
          }, failed: function failed() {
            e.terminate({ cause: g.causes.WEBRTC_ERROR, status_code: 500, reason_phrase: "Hold Failed" });
          } };return t.useUpdate ? this._sendUpdate({ sdpOffer: !0, eventHandlers: r, extraHeaders: t.extraHeaders }) : this._sendReinvite({ eventHandlers: r, extraHeaders: t.extraHeaders }), !0;
      } }, { key: "unhold", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            n = arguments.length > 1 ? arguments[1] : void 0;if (R.debug("unhold()"), this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_CONFIRMED) return !1;if (!1 === this._localHold) return !1;if (!this._isReadyToReOffer()) return !1;this._localHold = !1, this._onunhold("local");var r = { succeeded: function succeeded() {
            n && n();
          }, failed: function failed() {
            e.terminate({ cause: g.causes.WEBRTC_ERROR, status_code: 500, reason_phrase: "Unhold Failed" });
          } };return t.useUpdate ? this._sendUpdate({ sdpOffer: !0, eventHandlers: r, extraHeaders: t.extraHeaders }) : this._sendReinvite({ eventHandlers: r, extraHeaders: t.extraHeaders }), !0;
      } }, { key: "renegotiate", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            n = arguments.length > 1 ? arguments[1] : void 0;R.debug("renegotiate()");var r = t.rtcOfferConstraints || null;if (this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_CONFIRMED) return !1;if (!this._isReadyToReOffer()) return !1;var i = { succeeded: function succeeded() {
            n && n();
          }, failed: function failed() {
            e.terminate({ cause: g.causes.WEBRTC_ERROR, status_code: 500, reason_phrase: "Media Renegotiation Failed" });
          } };return this._setLocalMediaStatus(), t.useUpdate ? this._sendUpdate({ sdpOffer: !0, eventHandlers: i, rtcOfferConstraints: r, extraHeaders: t.extraHeaders }) : this._sendReinvite({ eventHandlers: i, rtcOfferConstraints: r, extraHeaders: t.extraHeaders }), !0;
      } }, { key: "refer", value: function value(e, t) {
        var n = this;R.debug("refer()");var r = e;if (this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_CONFIRMED) return !1;if (!(e = this._ua.normalizeTarget(e))) throw new TypeError("Invalid target: ".concat(r));var i = new E(this);i.sendRefer(e, t);var o = i.id;return this._referSubscribers[o] = i, i.on("requestFailed", function () {
          delete n._referSubscribers[o];
        }), i.on("accepted", function () {
          delete n._referSubscribers[o];
        }), i.on("failed", function () {
          delete n._referSubscribers[o];
        }), i;
      } }, { key: "sendRequest", value: function value(e, t) {
        return R.debug("sendRequest()"), this._dialog.sendRequest(e, t);
      } }, { key: "receiveRequest", value: function value(e) {
        var t = this;if (R.debug("receiveRequest()"), e.method === g.CANCEL) this._status !== k.STATUS_WAITING_FOR_ANSWER && this._status !== k.STATUS_ANSWERED || (this._status = k.STATUS_CANCELED, this._request.reply(487), this._failed("remote", e, g.causes.CANCELED));else switch (e.method) {case g.ACK:
            if (this._status !== k.STATUS_WAITING_FOR_ACK) return;if (this._status = k.STATUS_CONFIRMED, clearTimeout(this._timers.ackTimer), clearTimeout(this._timers.invite2xxTimer), this._late_sdp) {
              if (!e.body) {
                this.terminate({ cause: g.causes.MISSING_SDP, status_code: 400 });break;
              }var n = { originator: "remote", type: "answer", sdp: e.body };R.debug('emit "sdp"'), this.emit("sdp", n);var r = new RTCSessionDescription({ type: "answer", sdp: n.sdp });this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
                return t._connection.setRemoteDescription(r);
              }).then(function () {
                t._is_confirmed || t._confirmed("remote", e);
              }).catch(function (e) {
                t.terminate({ cause: g.causes.BAD_MEDIA_DESCRIPTION, status_code: 488 }), R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', e), t.emit("peerconnection:setremotedescriptionfailed", e);
              });
            } else this._is_confirmed || this._confirmed("remote", e);break;case g.BYE:
            this._status === k.STATUS_CONFIRMED || this._status === k.STATUS_WAITING_FOR_ACK ? (e.reply(200), this._ended("remote", e, g.causes.BYE)) : this._status === k.STATUS_INVITE_RECEIVED || this._status === k.STATUS_WAITING_FOR_ANSWER ? (e.reply(200), this._request.reply(487, "BYE Received"), this._ended("remote", e, g.causes.BYE)) : e.reply(403, "Wrong Status");break;case g.INVITE:
            this._status === k.STATUS_CONFIRMED ? e.hasHeader("replaces") ? this._receiveReplaces(e) : this._receiveReinvite(e) : e.reply(403, "Wrong Status");break;case g.INFO:
            if (this._status === k.STATUS_1XX_RECEIVED || this._status === k.STATUS_WAITING_FOR_ANSWER || this._status === k.STATUS_ANSWERED || this._status === k.STATUS_WAITING_FOR_ACK || this._status === k.STATUS_CONFIRMED) {
              var i = e.hasHeader("Content-Type") ? e.getHeader("Content-Type").toLowerCase() : void 0;i && i.match(/^application\/dtmf-relay/i) ? new w(this).init_incoming(e) : void 0 !== i ? new S(this).init_incoming(e) : e.reply(415);
            } else e.reply(403, "Wrong Status");break;case g.UPDATE:
            this._status === k.STATUS_CONFIRMED ? this._receiveUpdate(e) : e.reply(403, "Wrong Status");break;case g.REFER:
            this._status === k.STATUS_CONFIRMED ? this._receiveRefer(e) : e.reply(403, "Wrong Status");break;case g.NOTIFY:
            this._status === k.STATUS_CONFIRMED ? this._receiveNotify(e) : e.reply(403, "Wrong Status");break;default:
            e.reply(501);}
      } }, { key: "onTransportError", value: function value() {
        R.warn("onTransportError()"), this._status !== k.STATUS_TERMINATED && this.terminate({ status_code: 500, reason_phrase: g.causes.CONNECTION_ERROR, cause: g.causes.CONNECTION_ERROR });
      } }, { key: "onRequestTimeout", value: function value() {
        R.warn("onRequestTimeout()"), this._status !== k.STATUS_TERMINATED && this.terminate({ status_code: 408, reason_phrase: g.causes.REQUEST_TIMEOUT, cause: g.causes.REQUEST_TIMEOUT });
      } }, { key: "onDialogError", value: function value() {
        R.warn("onDialogError()"), this._status !== k.STATUS_TERMINATED && this.terminate({ status_code: 500, reason_phrase: g.causes.DIALOG_ERROR, cause: g.causes.DIALOG_ERROR });
      } }, { key: "newDTMF", value: function value(e) {
        R.debug("newDTMF()"), this.emit("newDTMF", e);
      } }, { key: "newInfo", value: function value(e) {
        R.debug("newInfo()"), this.emit("newInfo", e);
      } }, { key: "_isReadyToReOffer", value: function value() {
        return this._rtcReady ? this._dialog ? !0 !== this._dialog.uac_pending_reply && !0 !== this._dialog.uas_pending_reply || (R.debug("_isReadyToReOffer() | there is another INVITE/UPDATE transaction in progress"), !1) : (R.debug("_isReadyToReOffer() | session not established yet"), !1) : (R.debug("_isReadyToReOffer() | internal WebRTC status not ready"), !1);
      } }, { key: "_close", value: function value() {
        if (R.debug("close()"), this._localMediaStream && this._localMediaStreamLocallyGenerated && (R.debug("close() | closing local MediaStream"), v.closeMediaStream(this._localMediaStream)), this._status !== k.STATUS_TERMINATED) {
          if (this._status = k.STATUS_TERMINATED, this._connection) try {
            this._connection.close();
          } catch (e) {
            R.warn("close() | error closing the RTCPeerConnection: %o", e);
          }for (var e in this._timers) {
            Object.prototype.hasOwnProperty.call(this._timers, e) && clearTimeout(this._timers[e]);
          }for (var t in clearTimeout(this._sessionTimers.timer), this._dialog && (this._dialog.terminate(), delete this._dialog), this._earlyDialogs) {
            Object.prototype.hasOwnProperty.call(this._earlyDialogs, t) && (this._earlyDialogs[t].terminate(), delete this._earlyDialogs[t]);
          }for (var n in this._referSubscribers) {
            Object.prototype.hasOwnProperty.call(this._referSubscribers, n) && delete this._referSubscribers[n];
          }this._ua.destroyRTCSession(this);
        }
      } }, { key: "_setInvite2xxTimer", value: function value(e, t) {
        var n = y.T1;this._timers.invite2xxTimer = setTimeout(function r() {
          this._status === k.STATUS_WAITING_FOR_ACK && (e.reply(200, null, ["Contact: ".concat(this._contact)], t), n < y.T2 && (n *= 2) > y.T2 && (n = y.T2), this._timers.invite2xxTimer = setTimeout(r.bind(this), n));
        }.bind(this), n);
      } }, { key: "_setACKTimer", value: function value() {
        var e = this;this._timers.ackTimer = setTimeout(function () {
          e._status === k.STATUS_WAITING_FOR_ACK && (R.debug("no ACK received, terminating the session"), clearTimeout(e._timers.invite2xxTimer), e.sendRequest(g.BYE), e._ended("remote", null, g.causes.NO_ACK));
        }, y.TIMER_H);
      } }, { key: "_createRTCConnection", value: function value(e, t) {
        var n = this;this._connection = new RTCPeerConnection(e, t), this._connection.addEventListener("iceconnectionstatechange", function () {
          "failed" === n._connection.iceConnectionState && n.terminate({ cause: g.causes.RTP_TIMEOUT, status_code: 408, reason_phrase: g.causes.RTP_TIMEOUT });
        }), R.debug('emit "peerconnection"'), this.emit("peerconnection", { peerconnection: this._connection });
      } }, { key: "_createLocalDescription", value: function value(e, t) {
        var n = this;if (R.debug("createLocalDescription()"), "offer" !== e && "answer" !== e) throw new Error('createLocalDescription() | invalid type "'.concat(e, '"'));var r = this._connection;return this._rtcReady = !1, Promise.resolve().then(function () {
          return "offer" === e ? r.createOffer(t).catch(function (e) {
            return R.warn('emit "peerconnection:createofferfailed" [error:%o]', e), n.emit("peerconnection:createofferfailed", e), Promise.reject(e);
          }) : r.createAnswer(t).catch(function (e) {
            return R.warn('emit "peerconnection:createanswerfailed" [error:%o]', e), n.emit("peerconnection:createanswerfailed", e), Promise.reject(e);
          });
        }).then(function (e) {
          return r.setLocalDescription(e).catch(function (e) {
            return n._rtcReady = !0, R.warn('emit "peerconnection:setlocaldescriptionfailed" [error:%o]', e), n.emit("peerconnection:setlocaldescriptionfailed", e), Promise.reject(e);
          });
        }).then(function () {
          var i = t && t.iceRestart;if ("complete" === r.iceGatheringState && !i || "gathering" === r.iceGatheringState && n._iceReady) {
            n._rtcReady = !0;var o = { originator: "local", type: e, sdp: r.localDescription.sdp };return R.debug('emit "sdp"'), n.emit("sdp", o), Promise.resolve(o.sdp);
          }return new Promise(function (t) {
            var i,
                o,
                s = !1;n._iceReady = !1;var a = function a() {
              r.removeEventListener("icecandidate", i), r.removeEventListener("icegatheringstatechange", o), s = !0, n._rtcReady = !0, n._iceReady = !0;var a = { originator: "local", type: e, sdp: r.localDescription.sdp };R.debug('emit "sdp"'), n.emit("sdp", a), t(a.sdp);
            };r.addEventListener("icecandidate", i = function i(e) {
              var t = e.candidate;t ? n.emit("icecandidate", { candidate: t, ready: a }) : s || a();
            }), r.addEventListener("icegatheringstatechange", o = function o() {
              "complete" !== r.iceGatheringState || s || a();
            });
          });
        });
      } }, { key: "_createDialog", value: function value(e, t, n) {
        var r = "UAS" === t ? e.to_tag : e.from_tag,
            i = "UAS" === t ? e.from_tag : e.to_tag,
            o = e.call_id + r + i,
            s = this._earlyDialogs[o];if (n) return !!s || ((s = new C(this, e, t, C.C.STATUS_EARLY)).error ? (R.debug(s.error), this._failed("remote", e, g.causes.INTERNAL_ERROR), !1) : (this._earlyDialogs[o] = s, !0));if (this._from_tag = e.from_tag, this._to_tag = e.to_tag, s) return s.update(e, t), this._dialog = s, delete this._earlyDialogs[o], !0;var a = new C(this, e, t);return a.error ? (R.debug(a.error), this._failed("remote", e, g.causes.INTERNAL_ERROR), !1) : (this._dialog = a, !0);
      } }, { key: "_receiveReinvite", value: function value(e) {
        var t = this;R.debug("receiveReinvite()");var n = e.hasHeader("Content-Type") ? e.getHeader("Content-Type").toLowerCase() : void 0,
            r = { request: e, callback: void 0, reject: function () {
            var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};i = !0;var n = t.status_code || 403,
                r = t.reason_phrase || "",
                o = v.cloneArray(t.extraHeaders);if (this._status !== k.STATUS_CONFIRMED) return !1;if (n < 300 || n >= 700) throw new TypeError("Invalid status_code: ".concat(n));e.reply(n, r, o);
          }.bind(this) },
            i = !1;if (this.emit("reinvite", r), !i) {
          if (this._late_sdp = !1, !e.body) return this._late_sdp = !0, this._remoteHold && (this._remoteHold = !1, this._onunhold("remote")), void (this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
            return t._createLocalDescription("offer", t._rtcOfferConstraints);
          }).then(function (e) {
            o.call(t, e);
          }).catch(function () {
            e.reply(500);
          }));if ("application/sdp" !== n) return R.debug("invalid Content-Type"), void e.reply(415);this._processInDialogSdpOffer(e).then(function (e) {
            t._status !== k.STATUS_TERMINATED && o.call(t, e);
          }).catch(function (e) {
            R.warn(e);
          });
        }function o(t) {
          var n = this,
              i = ["Contact: ".concat(this._contact)];this._handleSessionTimersInIncomingRequest(e, i), this._late_sdp && (t = this._mangleOffer(t)), e.reply(200, null, i, t, function () {
            n._status = k.STATUS_WAITING_FOR_ACK, n._setInvite2xxTimer(e, t), n._setACKTimer();
          }), "function" == typeof r.callback && r.callback();
        }
      } }, { key: "_receiveUpdate", value: function value(e) {
        var t = this;R.debug("receiveUpdate()");var n = e.hasHeader("Content-Type") ? e.getHeader("Content-Type").toLowerCase() : void 0,
            r = { request: e, callback: void 0, reject: function () {
            var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};i = !0;var n = t.status_code || 403,
                r = t.reason_phrase || "",
                o = v.cloneArray(t.extraHeaders);if (this._status !== k.STATUS_CONFIRMED) return !1;if (n < 300 || n >= 700) throw new TypeError("Invalid status_code: ".concat(n));e.reply(n, r, o);
          }.bind(this) },
            i = !1;if (this.emit("update", r), !i) if (e.body) {
          if ("application/sdp" !== n) return R.debug("invalid Content-Type"), void e.reply(415);this._processInDialogSdpOffer(e).then(function (e) {
            t._status !== k.STATUS_TERMINATED && o.call(t, e);
          }).catch(function (e) {
            R.warn(e);
          });
        } else o.call(this, null);function o(t) {
          var n = ["Contact: ".concat(this._contact)];this._handleSessionTimersInIncomingRequest(e, n), e.reply(200, null, n, t), "function" == typeof r.callback && r.callback();
        }
      } }, { key: "_processInDialogSdpOffer", value: function value(e) {
        var t = this;R.debug("_processInDialogSdpOffer()");var n,
            r = e.parseSDP(),
            o = !1,
            s = i(r.media);try {
          for (s.s(); !(n = s.n()).done;) {
            var a = n.value;if (-1 !== x.indexOf(a.type)) {
              var l = a.direction || r.direction || "sendrecv";if ("sendonly" !== l && "inactive" !== l) {
                o = !1;break;
              }o = !0;
            }
          }
        } catch (e) {
          s.e(e);
        } finally {
          s.f();
        }var u = { originator: "remote", type: "offer", sdp: e.body };R.debug('emit "sdp"'), this.emit("sdp", u);var c = new RTCSessionDescription({ type: "offer", sdp: u.sdp });return this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
          if (t._status === k.STATUS_TERMINATED) throw new Error("terminated");return t._connection.setRemoteDescription(c).catch(function (n) {
            throw e.reply(488), R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', n), t.emit("peerconnection:setremotedescriptionfailed", n), n;
          });
        }).then(function () {
          if (t._status === k.STATUS_TERMINATED) throw new Error("terminated");!0 === t._remoteHold && !1 === o ? (t._remoteHold = !1, t._onunhold("remote")) : !1 === t._remoteHold && !0 === o && (t._remoteHold = !0, t._onhold("remote"));
        }).then(function () {
          if (t._status === k.STATUS_TERMINATED) throw new Error("terminated");return t._createLocalDescription("answer", t._rtcAnswerConstraints).catch(function (t) {
            throw e.reply(500), R.warn('emit "peerconnection:createtelocaldescriptionfailed" [error:%o]', t), t;
          });
        }).catch(function (e) {
          R.warn("_processInDialogSdpOffer() failed [error: %o]", e);
        }), this._connectionPromiseQueue;
      } }, { key: "_receiveRefer", value: function value(e) {
        var t = this;if (R.debug("receiveRefer()"), !e.refer_to) return R.debug("no Refer-To header field present in REFER"), void e.reply(400);if (e.refer_to.uri.scheme !== g.SIP) return R.debug("Refer-To header field points to a non-SIP URI scheme"), void e.reply(416);e.reply(202);var r = new A(this, e.cseq);function i(t) {
          var i = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};if (t = "function" == typeof t ? t : null, this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_CONFIRMED) return !1;var o = new n(this._ua);if (o.on("progress", function (e) {
            var t = e.response;r.notify(t.status_code, t.reason_phrase);
          }), o.on("accepted", function (e) {
            var t = e.response;r.notify(t.status_code, t.reason_phrase);
          }), o.on("_failed", function (e) {
            var t = e.message,
                n = e.cause;t ? r.notify(t.status_code, t.reason_phrase) : r.notify(487, n);
          }), e.refer_to.uri.hasHeader("replaces")) {
            var s = decodeURIComponent(e.refer_to.uri.getHeader("replaces"));i.extraHeaders = v.cloneArray(i.extraHeaders), i.extraHeaders.push("Replaces: ".concat(s));
          }o.connect(e.refer_to.uri.toAor(), i, t);
        }function o() {
          r.notify(603);
        }R.debug('emit "refer"'), this.emit("refer", { request: e, accept: function accept(e, n) {
            i.call(t, e, n);
          }, reject: function reject() {
            o.call(t);
          } });
      } }, { key: "_receiveNotify", value: function value(e) {
        switch (R.debug("receiveNotify()"), e.event || e.reply(400), e.event.event) {case "refer":
            var t, n;if (e.event.params && e.event.params.id) t = e.event.params.id, n = this._referSubscribers[t];else {
              if (1 !== Object.keys(this._referSubscribers).length) return void e.reply(400, "Missing event id parameter");n = this._referSubscribers[Object.keys(this._referSubscribers)[0]];
            }if (!n) return void e.reply(481, "Subscription does not exist");n.receiveNotify(e), e.reply(200);break;default:
            e.reply(489);}
      } }, { key: "_receiveReplaces", value: function value(e) {
        var t = this;function r(t) {
          var r = this;if (this._status !== k.STATUS_WAITING_FOR_ACK && this._status !== k.STATUS_CONFIRMED) return !1;var i = new n(this._ua);i.on("confirmed", function () {
            r.terminate();
          }), i.init_incoming(e, t);
        }function i() {
          R.debug("Replaced INVITE rejected by the user"), e.reply(486);
        }R.debug("receiveReplaces()"), this.emit("replaces", { request: e, accept: function accept(e) {
            r.call(t, e);
          }, reject: function reject() {
            i.call(t);
          } });
      } }, { key: "_sendInitialRequest", value: function value(e, t, n) {
        var r = this,
            i = new T(this._ua, this._request, { onRequestTimeout: function onRequestTimeout() {
            r.onRequestTimeout();
          }, onTransportError: function onTransportError() {
            r.onTransportError();
          }, onAuthenticated: function onAuthenticated(e) {
            r._request = e;
          }, onReceiveResponse: function onReceiveResponse(e) {
            r._receiveInviteResponse(e);
          } });Promise.resolve().then(function () {
          return n || (e.audio || e.video ? (r._localMediaStreamLocallyGenerated = !0, navigator.mediaDevices.getUserMedia(e).catch(function (e) {
            if (r._status === k.STATUS_TERMINATED) throw new Error("terminated");throw r._failed("local", null, g.causes.USER_DENIED_MEDIA_ACCESS), R.warn('emit "getusermediafailed" [error:%o]', e), r.emit("getusermediafailed", e), e;
          })) : void 0);
        }).then(function (e) {
          if (r._status === k.STATUS_TERMINATED) throw new Error("terminated");return r._localMediaStream = e, e && e.getTracks().forEach(function (t) {
            r._connection.addTrack(t, e);
          }), r._connecting(r._request), r._createLocalDescription("offer", t).catch(function (e) {
            throw r._failed("local", null, g.causes.WEBRTC_ERROR), e;
          });
        }).then(function (e) {
          if (r._is_canceled || r._status === k.STATUS_TERMINATED) throw new Error("terminated");r._request.body = e, r._status = k.STATUS_INVITE_SENT, R.debug('emit "sending" [request:%o]', r._request), r.emit("sending", { request: r._request }), i.send();
        }).catch(function (e) {
          r._status !== k.STATUS_TERMINATED && R.warn(e);
        });
      } }, { key: "_getDTMFRTPSender", value: function value() {
        var e = this._connection.getSenders().find(function (e) {
          return e.track && "audio" === e.track.kind;
        });if (e && e.dtmf) return e.dtmf;R.warn("sendDTMF() | no local audio track to send DTMF with");
      } }, { key: "_receiveInviteResponse", value: function value(e) {
        var t = this;if (R.debug("receiveInviteResponse()"), this._dialog && e.status_code >= 200 && e.status_code <= 299) {
          if (this._dialog.id.call_id === e.call_id && this._dialog.id.local_tag === e.from_tag && this._dialog.id.remote_tag === e.to_tag) return void this.sendRequest(g.ACK);var n = new C(this, e, "UAC");return void 0 !== n.error ? void R.debug(n.error) : (this.sendRequest(g.ACK), void this.sendRequest(g.BYE));
        }if (this._is_canceled) e.status_code >= 100 && e.status_code < 200 ? this._request.cancel(this._cancel_reason) : e.status_code >= 200 && e.status_code < 299 && this._acceptAndTerminate(e);else if (this._status === k.STATUS_INVITE_SENT || this._status === k.STATUS_1XX_RECEIVED) switch (!0) {case /^100$/.test(e.status_code):
            this._status = k.STATUS_1XX_RECEIVED;break;case /^1[0-9]{2}$/.test(e.status_code):
            if (!e.to_tag) {
              R.debug("1xx response received without to tag");break;
            }if (e.hasHeader("contact") && !this._createDialog(e, "UAC", !0)) break;if (this._status = k.STATUS_1XX_RECEIVED, !e.body) {
              this._progress("remote", e);break;
            }var r = { originator: "remote", type: "answer", sdp: e.body };R.debug('emit "sdp"'), this.emit("sdp", r);var i = new RTCSessionDescription({ type: "answer", sdp: r.sdp });this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
              return t._connection.setRemoteDescription(i);
            }).then(function () {
              return t._progress("remote", e);
            }).catch(function (e) {
              R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', e), t.emit("peerconnection:setremotedescriptionfailed", e);
            });break;case /^2[0-9]{2}$/.test(e.status_code):
            if (this._status = k.STATUS_CONFIRMED, !e.body) {
              this._acceptAndTerminate(e, 400, g.causes.MISSING_SDP), this._failed("remote", e, g.causes.BAD_MEDIA_DESCRIPTION);break;
            }if (!this._createDialog(e, "UAC")) break;var o = { originator: "remote", type: "answer", sdp: e.body };R.debug('emit "sdp"'), this.emit("sdp", o);var s = new RTCSessionDescription({ type: "answer", sdp: o.sdp });this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
              if ("stable" === t._connection.signalingState) return t._connection.createOffer(t._rtcOfferConstraints).then(function (e) {
                return t._connection.setLocalDescription(e);
              }).catch(function (n) {
                t._acceptAndTerminate(e, 500, n.toString()), t._failed("local", e, g.causes.WEBRTC_ERROR);
              });
            }).then(function () {
              t._connection.setRemoteDescription(s).then(function () {
                t._handleSessionTimersInIncomingResponse(e), t._accepted("remote", e), t.sendRequest(g.ACK), t._confirmed("local", null);
              }).catch(function (n) {
                t._acceptAndTerminate(e, 488, "Not Acceptable Here"), t._failed("remote", e, g.causes.BAD_MEDIA_DESCRIPTION), R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', n), t.emit("peerconnection:setremotedescriptionfailed", n);
              });
            });break;default:
            var a = v.sipErrorCause(e.status_code);this._failed("remote", e, a);}
      } }, { key: "_sendReinvite", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};R.debug("sendReinvite()");var n = v.cloneArray(t.extraHeaders),
            r = v.cloneObject(t.eventHandlers),
            i = t.rtcOfferConstraints || this._rtcOfferConstraints || null,
            o = !1;function s(e) {
          var t = this;if (this._status !== k.STATUS_TERMINATED && (this.sendRequest(g.ACK), !o)) if (this._handleSessionTimersInIncomingResponse(e), e.body) {
            if (e.hasHeader("Content-Type") && "application/sdp" === e.getHeader("Content-Type").toLowerCase()) {
              var n = { originator: "remote", type: "answer", sdp: e.body };R.debug('emit "sdp"'), this.emit("sdp", n);var i = new RTCSessionDescription({ type: "answer", sdp: n.sdp });this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
                return t._connection.setRemoteDescription(i);
              }).then(function () {
                r.succeeded && r.succeeded(e);
              }).catch(function (e) {
                a.call(t), R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', e), t.emit("peerconnection:setremotedescriptionfailed", e);
              });
            } else a.call(this);
          } else a.call(this);
        }function a(e) {
          r.failed && r.failed(e);
        }n.push("Contact: ".concat(this._contact)), n.push("Content-Type: application/sdp"), this._sessionTimers.running && n.push("Session-Expires: ".concat(this._sessionTimers.currentExpires, ";refresher=").concat(this._sessionTimers.refresher ? "uac" : "uas")), this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
          return e._createLocalDescription("offer", i);
        }).then(function (t) {
          var r = { originator: "local", type: "offer", sdp: t = e._mangleOffer(t) };R.debug('emit "sdp"'), e.emit("sdp", r), e.sendRequest(g.INVITE, { extraHeaders: n, body: t, eventHandlers: { onSuccessResponse: function onSuccessResponse(t) {
                s.call(e, t), o = !0;
              }, onErrorResponse: function onErrorResponse(t) {
                a.call(e, t);
              }, onTransportError: function onTransportError() {
                e.onTransportError();
              }, onRequestTimeout: function onRequestTimeout() {
                e.onRequestTimeout();
              }, onDialogError: function onDialogError() {
                e.onDialogError();
              } } });
        }).catch(function () {
          a();
        });
      } }, { key: "_sendUpdate", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};R.debug("sendUpdate()");var n = v.cloneArray(t.extraHeaders),
            r = v.cloneObject(t.eventHandlers),
            i = t.rtcOfferConstraints || this._rtcOfferConstraints || null,
            o = t.sdpOffer || !1,
            s = !1;function a(e) {
          var t = this;if (this._status !== k.STATUS_TERMINATED && !s) if (this._handleSessionTimersInIncomingResponse(e), o) {
            if (!e.body) return void l.call(this);if (!e.hasHeader("Content-Type") || "application/sdp" !== e.getHeader("Content-Type").toLowerCase()) return void l.call(this);var n = { originator: "remote", type: "answer", sdp: e.body };R.debug('emit "sdp"'), this.emit("sdp", n);var i = new RTCSessionDescription({ type: "answer", sdp: n.sdp });this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
              return t._connection.setRemoteDescription(i);
            }).then(function () {
              r.succeeded && r.succeeded(e);
            }).catch(function (e) {
              l.call(t), R.warn('emit "peerconnection:setremotedescriptionfailed" [error:%o]', e), t.emit("peerconnection:setremotedescriptionfailed", e);
            });
          } else r.succeeded && r.succeeded(e);
        }function l(e) {
          r.failed && r.failed(e);
        }n.push("Contact: ".concat(this._contact)), this._sessionTimers.running && n.push("Session-Expires: ".concat(this._sessionTimers.currentExpires, ";refresher=").concat(this._sessionTimers.refresher ? "uac" : "uas")), o ? (n.push("Content-Type: application/sdp"), this._connectionPromiseQueue = this._connectionPromiseQueue.then(function () {
          return e._createLocalDescription("offer", i);
        }).then(function (t) {
          var r = { originator: "local", type: "offer", sdp: t = e._mangleOffer(t) };R.debug('emit "sdp"'), e.emit("sdp", r), e.sendRequest(g.UPDATE, { extraHeaders: n, body: t, eventHandlers: { onSuccessResponse: function onSuccessResponse(t) {
                a.call(e, t), s = !0;
              }, onErrorResponse: function onErrorResponse(t) {
                l.call(e, t);
              }, onTransportError: function onTransportError() {
                e.onTransportError();
              }, onRequestTimeout: function onRequestTimeout() {
                e.onRequestTimeout();
              }, onDialogError: function onDialogError() {
                e.onDialogError();
              } } });
        }).catch(function () {
          l.call(e);
        })) : this.sendRequest(g.UPDATE, { extraHeaders: n, eventHandlers: { onSuccessResponse: function onSuccessResponse(t) {
              a.call(e, t);
            }, onErrorResponse: function onErrorResponse(t) {
              l.call(e, t);
            }, onTransportError: function onTransportError() {
              e.onTransportError();
            }, onRequestTimeout: function onRequestTimeout() {
              e.onRequestTimeout();
            }, onDialogError: function onDialogError() {
              e.onDialogError();
            } } });
      } }, { key: "_acceptAndTerminate", value: function value(e, t, n) {
        R.debug("acceptAndTerminate()");var r = [];t && (n = n || g.REASON_PHRASE[t] || "", r.push("Reason: SIP ;cause=".concat(t, '; text="').concat(n, '"'))), (this._dialog || this._createDialog(e, "UAC")) && (this.sendRequest(g.ACK), this.sendRequest(g.BYE, { extraHeaders: r })), this._status = k.STATUS_TERMINATED;
      } }, { key: "_mangleOffer", value: function value(e) {
        if (!this._localHold && !this._remoteHold) return e;if (e = f.parse(e), this._localHold && !this._remoteHold) {
          R.debug("mangleOffer() | me on hold, mangling offer");var t,
              n = i(e.media);try {
            for (n.s(); !(t = n.n()).done;) {
              var r = t.value;-1 !== x.indexOf(r.type) && (r.direction ? "sendrecv" === r.direction ? r.direction = "sendonly" : "recvonly" === r.direction && (r.direction = "inactive") : r.direction = "sendonly");
            }
          } catch (e) {
            n.e(e);
          } finally {
            n.f();
          }
        } else if (this._localHold && this._remoteHold) {
          R.debug("mangleOffer() | both on hold, mangling offer");var o,
              s = i(e.media);try {
            for (s.s(); !(o = s.n()).done;) {
              var a = o.value;-1 !== x.indexOf(a.type) && (a.direction = "inactive");
            }
          } catch (e) {
            s.e(e);
          } finally {
            s.f();
          }
        } else if (this._remoteHold) {
          R.debug("mangleOffer() | remote on hold, mangling offer");var l,
              u = i(e.media);try {
            for (u.s(); !(l = u.n()).done;) {
              var c = l.value;-1 !== x.indexOf(c.type) && (c.direction ? "sendrecv" === c.direction ? c.direction = "recvonly" : "recvonly" === c.direction && (c.direction = "inactive") : c.direction = "recvonly");
            }
          } catch (e) {
            u.e(e);
          } finally {
            u.f();
          }
        }return f.write(e);
      } }, { key: "_setLocalMediaStatus", value: function value() {
        var e = !0,
            t = !0;(this._localHold || this._remoteHold) && (e = !1, t = !1), this._audioMuted && (e = !1), this._videoMuted && (t = !1), this._toggleMuteAudio(!e), this._toggleMuteVideo(!t);
      } }, { key: "_handleSessionTimersInIncomingRequest", value: function value(e, t) {
        var n;this._sessionTimers.enabled && (e.session_expires && e.session_expires >= g.MIN_SESSION_EXPIRES ? (this._sessionTimers.currentExpires = e.session_expires, n = e.session_expires_refresher || "uas") : (this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires, n = "uas"), t.push("Session-Expires: ".concat(this._sessionTimers.currentExpires, ";refresher=").concat(n)), this._sessionTimers.refresher = "uas" === n, this._runSessionTimer());
      } }, { key: "_handleSessionTimersInIncomingResponse", value: function value(e) {
        var t;this._sessionTimers.enabled && (e.session_expires && e.session_expires >= g.MIN_SESSION_EXPIRES ? (this._sessionTimers.currentExpires = e.session_expires, t = e.session_expires_refresher || "uac") : (this._sessionTimers.currentExpires = this._sessionTimers.defaultExpires, t = "uac"), this._sessionTimers.refresher = "uac" === t, this._runSessionTimer());
      } }, { key: "_runSessionTimer", value: function value() {
        var e = this,
            t = this._sessionTimers.currentExpires;this._sessionTimers.running = !0, clearTimeout(this._sessionTimers.timer), this._sessionTimers.refresher ? this._sessionTimers.timer = setTimeout(function () {
          e._status !== k.STATUS_TERMINATED && e._isReadyToReOffer() && (R.debug("runSessionTimer() | sending session refresh request"), e._sessionTimers.refreshMethod === g.UPDATE ? e._sendUpdate() : e._sendReinvite());
        }, 500 * t) : this._sessionTimers.timer = setTimeout(function () {
          e._status !== k.STATUS_TERMINATED && (R.warn("runSessionTimer() | timer expired, terminating the session"), e.terminate({ cause: g.causes.REQUEST_TIMEOUT, status_code: 408, reason_phrase: "Session Timer Expired" }));
        }, 1100 * t);
      } }, { key: "_toggleMuteAudio", value: function value(e) {
        var t,
            n = i(this._connection.getSenders().filter(function (e) {
          return e.track && "audio" === e.track.kind;
        }));try {
          for (n.s(); !(t = n.n()).done;) {
            t.value.track.enabled = !e;
          }
        } catch (e) {
          n.e(e);
        } finally {
          n.f();
        }
      } }, { key: "_toggleMuteVideo", value: function value(e) {
        var t,
            n = i(this._connection.getSenders().filter(function (e) {
          return e.track && "video" === e.track.kind;
        }));try {
          for (n.s(); !(t = n.n()).done;) {
            t.value.track.enabled = !e;
          }
        } catch (e) {
          n.e(e);
        } finally {
          n.f();
        }
      } }, { key: "_newRTCSession", value: function value(e, t) {
        R.debug("newRTCSession()"), this._ua.newRTCSession(this, { originator: e, session: this, request: t });
      } }, { key: "_connecting", value: function value(e) {
        R.debug("session connecting"), R.debug('emit "connecting"'), this.emit("connecting", { request: e });
      } }, { key: "_progress", value: function value(e, t) {
        R.debug("session progress"), R.debug('emit "progress"'), this.emit("progress", { originator: e, response: t || null });
      } }, { key: "_accepted", value: function value(e, t) {
        R.debug("session accepted"), this._start_time = new Date(), R.debug('emit "accepted"'), this.emit("accepted", { originator: e, response: t || null });
      } }, { key: "_confirmed", value: function value(e, t) {
        R.debug("session confirmed"), this._is_confirmed = !0, R.debug('emit "confirmed"'), this.emit("confirmed", { originator: e, ack: t || null });
      } }, { key: "_ended", value: function value(e, t, n) {
        R.debug("session ended"), this._end_time = new Date(), this._close(), R.debug('emit "ended"'), this.emit("ended", { originator: e, message: t || null, cause: n });
      } }, { key: "_failed", value: function value(e, t, n) {
        R.debug("session failed"), R.debug('emit "_failed"'), this.emit("_failed", { originator: e, message: t || null, cause: n }), this._close(), R.debug('emit "failed"'), this.emit("failed", { originator: e, message: t || null, cause: n });
      } }, { key: "_onhold", value: function value(e) {
        R.debug("session onhold"), this._setLocalMediaStatus(), R.debug('emit "hold"'), this.emit("hold", { originator: e });
      } }, { key: "_onunhold", value: function value(e) {
        R.debug("session onunhold"), this._setLocalMediaStatus(), R.debug('emit "unhold"'), this.emit("unhold", { originator: e });
      } }, { key: "_onmute", value: function value(e) {
        var t = e.audio,
            n = e.video;R.debug("session onmute"), this._setLocalMediaStatus(), R.debug('emit "muted"'), this.emit("muted", { audio: t, video: n });
      } }, { key: "_onunmute", value: function value(e) {
        var t = e.audio,
            n = e.video;R.debug("session onunmute"), this._setLocalMediaStatus(), R.debug('emit "unmuted"'), this.emit("unmuted", { audio: t, video: n });
      } }, { key: "C", get: function get() {
        return k;
      } }, { key: "causes", get: function get() {
        return g.causes;
      } }, { key: "id", get: function get() {
        return this._id;
      } }, { key: "connection", get: function get() {
        return this._connection;
      } }, { key: "contact", get: function get() {
        return this._contact;
      } }, { key: "direction", get: function get() {
        return this._direction;
      } }, { key: "local_identity", get: function get() {
        return this._local_identity;
      } }, { key: "remote_identity", get: function get() {
        return this._remote_identity;
      } }, { key: "start_time", get: function get() {
        return this._start_time;
      } }, { key: "end_time", get: function get() {
        return this._end_time;
      } }, { key: "data", get: function get() {
        return this._data;
      }, set: function set(e) {
        this._data = e;
      } }, { key: "status", get: function get() {
        return this._status;
      } }]), n;
  }(h);
}, function (e, t, n) {
  "use strict";
  var r = n(1),
      i = n(2),
      o = n(3),
      s = new r("Socket");t.isSocket = function (e) {
    if (Array.isArray(e)) return !1;if (void 0 === e) return s.warn("undefined JsSIP.Socket instance"), !1;try {
      if (!i.isString(e.url)) throw s.warn("missing or invalid JsSIP.Socket url property"), new Error("Missing or invalid JsSIP.Socket url property");if (!i.isString(e.via_transport)) throw s.warn("missing or invalid JsSIP.Socket via_transport property"), new Error("Missing or invalid JsSIP.Socket via_transport property");if (-1 === o.parse(e.sip_uri, "SIP_URI")) throw s.warn("missing or invalid JsSIP.Socket sip_uri property"), new Error("missing or invalid JsSIP.Socket sip_uri property");
    } catch (e) {
      return !1;
    }try {
      ["connect", "disconnect", "send"].forEach(function (t) {
        if (!i.isFunction(e[t])) throw s.warn("missing or invalid JsSIP.Socket method: ".concat(t)), new Error("Missing or invalid JsSIP.Socket method: ".concat(t));
      });
    } catch (e) {
      return !1;
    }return !0;
  };
}, function (e, t, n) {
  (function (r) {
    var i;
    /*!
     * EventEmitter2
     * https://github.com/hij1nx/EventEmitter2
     *
     * Copyright (c) 2013 hij1nx
     * Licensed under the MIT license.
     */!function (o) {
      var s = Array.isArray ? Array.isArray : function (e) {
        return "[object Array]" === Object.prototype.toString.call(e);
      };function a() {
        this._events = {}, this._conf && l.call(this, this._conf);
      }function l(e) {
        e ? (this._conf = e, e.delimiter && (this.delimiter = e.delimiter), this._maxListeners = void 0 !== e.maxListeners ? e.maxListeners : 10, e.wildcard && (this.wildcard = e.wildcard), e.newListener && (this._newListener = e.newListener), e.removeListener && (this._removeListener = e.removeListener), e.verboseMemoryLeak && (this.verboseMemoryLeak = e.verboseMemoryLeak), e.ignoreErrors && (this.ignoreErrors = e.ignoreErrors), this.wildcard && (this.listenerTree = {})) : this._maxListeners = 10;
      }function u(e, t) {
        var n = "(node) warning: possible EventEmitter memory leak detected. " + e + " listeners added. Use emitter.setMaxListeners() to increase limit.";if (this.verboseMemoryLeak && (n += " Event name: " + t + "."), void 0 !== r && r.emitWarning) {
          var i = new Error(n);i.name = "MaxListenersExceededWarning", i.emitter = this, i.count = e, r.emitWarning(i);
        } else console.error(n), console.trace && console.trace();
      }var c = function c(e, t, n) {
        var r = arguments.length;switch (r) {case 0:
            return [];case 1:
            return [e];case 2:
            return [e, t];case 3:
            return [e, t, n];default:
            for (var i = new Array(r); r--;) {
              i[r] = arguments[r];
            }return i;}
      };function d(e) {
        this._events = {}, this._newListener = !1, this._removeListener = !1, this.verboseMemoryLeak = !1, l.call(this, e);
      }function h(e, t, n, r) {
        if (!n) return [];var i,
            o,
            s,
            a,
            l,
            u,
            c,
            d = [],
            f = t.length,
            p = t[r],
            g = t[r + 1];if (r === f && n._listeners) {
          if ("function" == typeof n._listeners) return e && e.push(n._listeners), [n];for (i = 0, o = n._listeners.length; i < o; i++) {
            e && e.push(n._listeners[i]);
          }return [n];
        }if ("*" === p || "**" === p || n[p]) {
          if ("*" === p) {
            for (s in n) {
              "_listeners" !== s && n.hasOwnProperty(s) && (d = d.concat(h(e, t, n[s], r + 1)));
            }return d;
          }if ("**" === p) {
            for (s in (c = r + 1 === f || r + 2 === f && "*" === g) && n._listeners && (d = d.concat(h(e, t, n, f))), n) {
              "_listeners" !== s && n.hasOwnProperty(s) && ("*" === s || "**" === s ? (n[s]._listeners && !c && (d = d.concat(h(e, t, n[s], f))), d = d.concat(h(e, t, n[s], r))) : d = s === g ? d.concat(h(e, t, n[s], r + 2)) : d.concat(h(e, t, n[s], r)));
            }return d;
          }d = d.concat(h(e, t, n[p], r + 1));
        }if ((a = n["*"]) && h(e, t, a, r + 1), l = n["**"]) if (r < f) for (s in l._listeners && h(e, t, l, f), l) {
          "_listeners" !== s && l.hasOwnProperty(s) && (s === g ? h(e, t, l[s], r + 2) : s === p ? h(e, t, l[s], r + 1) : ((u = {})[s] = l[s], h(e, t, { "**": u }, r + 1)));
        } else l._listeners ? h(e, t, l, f) : l["*"] && l["*"]._listeners && h(e, t, l["*"], f);return d;
      }function f(e, t) {
        for (var n = 0, r = (e = "string" == typeof e ? e.split(this.delimiter) : e.slice()).length; n + 1 < r; n++) {
          if ("**" === e[n] && "**" === e[n + 1]) return;
        }for (var i = this.listenerTree, o = e.shift(); void 0 !== o;) {
          if (i[o] || (i[o] = {}), i = i[o], 0 === e.length) return i._listeners ? ("function" == typeof i._listeners && (i._listeners = [i._listeners]), i._listeners.push(t), !i._listeners.warned && this._maxListeners > 0 && i._listeners.length > this._maxListeners && (i._listeners.warned = !0, u.call(this, i._listeners.length, o))) : i._listeners = t, !0;o = e.shift();
        }return !0;
      }d.EventEmitter2 = d, d.prototype.delimiter = ".", d.prototype.setMaxListeners = function (e) {
        void 0 !== e && (this._maxListeners = e, this._conf || (this._conf = {}), this._conf.maxListeners = e);
      }, d.prototype.event = "", d.prototype.once = function (e, t) {
        return this._once(e, t, !1);
      }, d.prototype.prependOnceListener = function (e, t) {
        return this._once(e, t, !0);
      }, d.prototype._once = function (e, t, n) {
        return this._many(e, 1, t, n), this;
      }, d.prototype.many = function (e, t, n) {
        return this._many(e, t, n, !1);
      }, d.prototype.prependMany = function (e, t, n) {
        return this._many(e, t, n, !0);
      }, d.prototype._many = function (e, t, n, r) {
        var i = this;if ("function" != typeof n) throw new Error("many only accepts instances of Function");function o() {
          return 0 == --t && i.off(e, o), n.apply(this, arguments);
        }return o._origin = n, this._on(e, o, r), i;
      }, d.prototype.emit = function () {
        if (!this._events && !this._all) return !1;this._events || a.call(this);var e = arguments[0];if ("newListener" === e && !this._newListener && !this._events.newListener) return !1;var t,
            n,
            r,
            i,
            o,
            s = arguments.length;if (this._all && this._all.length) {
          if (o = this._all.slice(), s > 3) for (t = new Array(s), i = 0; i < s; i++) {
            t[i] = arguments[i];
          }for (r = 0, n = o.length; r < n; r++) {
            switch (this.event = e, s) {case 1:
                o[r].call(this, e);break;case 2:
                o[r].call(this, e, arguments[1]);break;case 3:
                o[r].call(this, e, arguments[1], arguments[2]);break;default:
                o[r].apply(this, t);}
          }
        }if (this.wildcard) {
          o = [];var l = "string" == typeof e ? e.split(this.delimiter) : e.slice();h.call(this, o, l, this.listenerTree, 0);
        } else {
          if ("function" == typeof (o = this._events[e])) {
            switch (this.event = e, s) {case 1:
                o.call(this);break;case 2:
                o.call(this, arguments[1]);break;case 3:
                o.call(this, arguments[1], arguments[2]);break;default:
                for (t = new Array(s - 1), i = 1; i < s; i++) {
                  t[i - 1] = arguments[i];
                }o.apply(this, t);}return !0;
          }o && (o = o.slice());
        }if (o && o.length) {
          if (s > 3) for (t = new Array(s - 1), i = 1; i < s; i++) {
            t[i - 1] = arguments[i];
          }for (r = 0, n = o.length; r < n; r++) {
            switch (this.event = e, s) {case 1:
                o[r].call(this);break;case 2:
                o[r].call(this, arguments[1]);break;case 3:
                o[r].call(this, arguments[1], arguments[2]);break;default:
                o[r].apply(this, t);}
          }return !0;
        }if (!this.ignoreErrors && !this._all && "error" === e) throw arguments[1] instanceof Error ? arguments[1] : new Error("Uncaught, unspecified 'error' event.");return !!this._all;
      }, d.prototype.emitAsync = function () {
        if (!this._events && !this._all) return !1;this._events || a.call(this);var e = arguments[0];if ("newListener" === e && !this._newListener && !this._events.newListener) return Promise.resolve([!1]);var t,
            n,
            r,
            i,
            o,
            s = [],
            l = arguments.length;if (this._all) {
          if (l > 3) for (t = new Array(l), i = 1; i < l; i++) {
            t[i] = arguments[i];
          }for (r = 0, n = this._all.length; r < n; r++) {
            switch (this.event = e, l) {case 1:
                s.push(this._all[r].call(this, e));break;case 2:
                s.push(this._all[r].call(this, e, arguments[1]));break;case 3:
                s.push(this._all[r].call(this, e, arguments[1], arguments[2]));break;default:
                s.push(this._all[r].apply(this, t));}
          }
        }if (this.wildcard) {
          o = [];var u = "string" == typeof e ? e.split(this.delimiter) : e.slice();h.call(this, o, u, this.listenerTree, 0);
        } else o = this._events[e];if ("function" == typeof o) switch (this.event = e, l) {case 1:
            s.push(o.call(this));break;case 2:
            s.push(o.call(this, arguments[1]));break;case 3:
            s.push(o.call(this, arguments[1], arguments[2]));break;default:
            for (t = new Array(l - 1), i = 1; i < l; i++) {
              t[i - 1] = arguments[i];
            }s.push(o.apply(this, t));} else if (o && o.length) {
          if (o = o.slice(), l > 3) for (t = new Array(l - 1), i = 1; i < l; i++) {
            t[i - 1] = arguments[i];
          }for (r = 0, n = o.length; r < n; r++) {
            switch (this.event = e, l) {case 1:
                s.push(o[r].call(this));break;case 2:
                s.push(o[r].call(this, arguments[1]));break;case 3:
                s.push(o[r].call(this, arguments[1], arguments[2]));break;default:
                s.push(o[r].apply(this, t));}
          }
        } else if (!this.ignoreErrors && !this._all && "error" === e) return arguments[1] instanceof Error ? Promise.reject(arguments[1]) : Promise.reject("Uncaught, unspecified 'error' event.");return Promise.all(s);
      }, d.prototype.on = function (e, t) {
        return this._on(e, t, !1);
      }, d.prototype.prependListener = function (e, t) {
        return this._on(e, t, !0);
      }, d.prototype.onAny = function (e) {
        return this._onAny(e, !1);
      }, d.prototype.prependAny = function (e) {
        return this._onAny(e, !0);
      }, d.prototype.addListener = d.prototype.on, d.prototype._onAny = function (e, t) {
        if ("function" != typeof e) throw new Error("onAny only accepts instances of Function");return this._all || (this._all = []), t ? this._all.unshift(e) : this._all.push(e), this;
      }, d.prototype._on = function (e, t, n) {
        if ("function" == typeof e) return this._onAny(e, t), this;if ("function" != typeof t) throw new Error("on only accepts instances of Function");return this._events || a.call(this), this._newListener && this.emit("newListener", e, t), this.wildcard ? (f.call(this, e, t), this) : (this._events[e] ? ("function" == typeof this._events[e] && (this._events[e] = [this._events[e]]), n ? this._events[e].unshift(t) : this._events[e].push(t), !this._events[e].warned && this._maxListeners > 0 && this._events[e].length > this._maxListeners && (this._events[e].warned = !0, u.call(this, this._events[e].length, e))) : this._events[e] = t, this);
      }, d.prototype.off = function (e, t) {
        if ("function" != typeof t) throw new Error("removeListener only takes instances of Function");var n,
            r = [];if (this.wildcard) {
          var i = "string" == typeof e ? e.split(this.delimiter) : e.slice();r = h.call(this, null, i, this.listenerTree, 0);
        } else {
          if (!this._events[e]) return this;n = this._events[e], r.push({ _listeners: n });
        }for (var o = 0; o < r.length; o++) {
          var a = r[o];if (n = a._listeners, s(n)) {
            for (var l = -1, u = 0, c = n.length; u < c; u++) {
              if (n[u] === t || n[u].listener && n[u].listener === t || n[u]._origin && n[u]._origin === t) {
                l = u;break;
              }
            }if (l < 0) continue;return this.wildcard ? a._listeners.splice(l, 1) : this._events[e].splice(l, 1), 0 === n.length && (this.wildcard ? delete a._listeners : delete this._events[e]), this._removeListener && this.emit("removeListener", e, t), this;
          }(n === t || n.listener && n.listener === t || n._origin && n._origin === t) && (this.wildcard ? delete a._listeners : delete this._events[e], this._removeListener && this.emit("removeListener", e, t));
        }return function e(t) {
          if (void 0 !== t) {
            var n = Object.keys(t);for (var r in n) {
              var i = n[r],
                  o = t[i];o instanceof Function || "object" != (typeof o === "undefined" ? "undefined" : (0, _typeof3.default)(o)) || null === o || (Object.keys(o).length > 0 && e(t[i]), 0 === Object.keys(o).length && delete t[i]);
            }
          }
        }(this.listenerTree), this;
      }, d.prototype.offAny = function (e) {
        var t,
            n = 0,
            r = 0;if (e && this._all && this._all.length > 0) {
          for (n = 0, r = (t = this._all).length; n < r; n++) {
            if (e === t[n]) return t.splice(n, 1), this._removeListener && this.emit("removeListenerAny", e), this;
          }
        } else {
          if (t = this._all, this._removeListener) for (n = 0, r = t.length; n < r; n++) {
            this.emit("removeListenerAny", t[n]);
          }this._all = [];
        }return this;
      }, d.prototype.removeListener = d.prototype.off, d.prototype.removeAllListeners = function (e) {
        if (void 0 === e) return !this._events || a.call(this), this;if (this.wildcard) for (var t = "string" == typeof e ? e.split(this.delimiter) : e.slice(), n = h.call(this, null, t, this.listenerTree, 0), r = 0; r < n.length; r++) {
          n[r]._listeners = null;
        } else this._events && (this._events[e] = null);return this;
      }, d.prototype.listeners = function (e) {
        if (this.wildcard) {
          var t = [],
              n = "string" == typeof e ? e.split(this.delimiter) : e.slice();return h.call(this, t, n, this.listenerTree, 0), t;
        }return this._events || a.call(this), this._events[e] || (this._events[e] = []), s(this._events[e]) || (this._events[e] = [this._events[e]]), this._events[e];
      }, d.prototype.eventNames = function () {
        return Object.keys(this._events);
      }, d.prototype.listenerCount = function (e) {
        return this.listeners(e).length;
      }, d.prototype.listenersAny = function () {
        return this._all ? this._all : [];
      }, d.prototype.waitFor = function (e, t) {
        var n,
            r = this,
            i = !(!t || void 0 === t.handleError) && t.handleError,
            o = !(!t || void 0 === t.filter) && t.filter,
            s = t && void 0 !== t.timeout ? t.timeout : 0,
            a = new Promise(function (t, a) {
          var l,
              u,
              d = s > 0 && setTimeout(function () {
            d = 0, h(new Error("timeout"));
          }, s);function h(n, i) {
            u || (u = !0, !l && r.off(e, f), l = !0, d && clearTimeout(d), d = 0, n ? a(n) : t(i));
          }function f() {
            if (!o || o.apply(r, arguments)) if (i) {
              var e = arguments[0];e ? h(e) : h(null, c.apply(null, arguments).slice(1));
            } else h(null, c.apply(null, arguments));
          }n = function n(e) {
            h(new Error(e || "canceled"));
          }, r._on(e, f, !1);
        });return Object.create(r, { then: { value: function value(e, t) {
              return a.then(e, t);
            } }, cancel: { value: function value() {
              n && n();
            } } });
      }, void 0 === (i = function () {
        return d;
      }.call(t, n, t, e)) || (e.exports = i);
    }();
  }).call(this, n(15));
}, function (e, t, n) {
  var r, i, o, s;
  /*!
   * mustache.js - Logic-less {{mustache}} templates with JavaScript
   * http://github.com/janl/mustache.js
   */s = function s(e) {
    var t = Object.prototype.toString,
        n = Array.isArray || function (e) {
      return "[object Array]" === t.call(e);
    };function r(e) {
      return "function" == typeof e;
    }function i(e) {
      return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
    }function o(e, t) {
      return null != e && "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && t in e;
    }var s = RegExp.prototype.test,
        a = /\S/;function l(e) {
      return !function (e, t) {
        return s.call(e, t);
      }(a, e);
    }var u = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;" },
        c = /\s*/,
        d = /\s+/,
        h = /\s*=/,
        f = /\s*\}/,
        p = /#|\^|\/|>|\{|&|=|!/;function g(e) {
      this.string = e, this.tail = e, this.pos = 0;
    }function _(e, t) {
      this.view = e, this.cache = { ".": this.view }, this.parent = t;
    }function m() {
      this.cache = {};
    }g.prototype.eos = function () {
      return "" === this.tail;
    }, g.prototype.scan = function (e) {
      var t = this.tail.match(e);if (!t || 0 !== t.index) return "";var n = t[0];return this.tail = this.tail.substring(n.length), this.pos += n.length, n;
    }, g.prototype.scanUntil = function (e) {
      var t,
          n = this.tail.search(e);switch (n) {case -1:
          t = this.tail, this.tail = "";break;case 0:
          t = "";break;default:
          t = this.tail.substring(0, n), this.tail = this.tail.substring(n);}return this.pos += t.length, t;
    }, _.prototype.push = function (e) {
      return new _(e, this);
    }, _.prototype.lookup = function (e) {
      var t,
          n,
          i,
          s = this.cache;if (s.hasOwnProperty(e)) t = s[e];else {
        for (var a, l, u, c = this, d = !1; c;) {
          if (e.indexOf(".") > 0) for (a = c.view, l = e.split("."), u = 0; null != a && u < l.length;) {
            u === l.length - 1 && (d = o(a, l[u]) || (n = a, i = l[u], null != n && "object" != (typeof n === "undefined" ? "undefined" : (0, _typeof3.default)(n)) && n.hasOwnProperty && n.hasOwnProperty(i))), a = a[l[u++]];
          } else a = c.view[e], d = o(c.view, e);if (d) {
            t = a;break;
          }c = c.parent;
        }s[e] = t;
      }return r(t) && (t = t.call(this.view)), t;
    }, m.prototype.clearCache = function () {
      this.cache = {};
    }, m.prototype.parse = function (t, r) {
      var o = this.cache,
          s = t + ":" + (r || e.tags).join(":"),
          a = o[s];return null == a && (a = o[s] = function (t, r) {
        if (!t) return [];var o,
            s,
            a,
            u = !1,
            _ = [],
            m = [],
            v = [],
            y = !1,
            b = !1,
            C = "",
            T = 0;function w() {
          if (y && !b) for (; v.length;) {
            delete m[v.pop()];
          } else v = [];y = !1, b = !1;
        }function S(e) {
          if ("string" == typeof e && (e = e.split(d, 2)), !n(e) || 2 !== e.length) throw new Error("Invalid tags: " + e);o = new RegExp(i(e[0]) + "\\s*"), s = new RegExp("\\s*" + i(e[1])), a = new RegExp("\\s*" + i("}" + e[1]));
        }S(r || e.tags);for (var A, E, I, R, k, x, M = new g(t); !M.eos();) {
          if (A = M.pos, I = M.scanUntil(o)) for (var D = 0, O = I.length; D < O; ++D) {
            l(R = I.charAt(D)) ? (v.push(m.length), C += R) : (b = !0, u = !0, C += " "), m.push(["text", R, A, A + 1]), A += 1, "\n" === R && (w(), C = "", T = 0, u = !1);
          }if (!M.scan(o)) break;if (y = !0, E = M.scan(p) || "name", M.scan(c), "=" === E ? (I = M.scanUntil(h), M.scan(h), M.scanUntil(s)) : "{" === E ? (I = M.scanUntil(a), M.scan(f), M.scanUntil(s), E = "&") : I = M.scanUntil(s), !M.scan(s)) throw new Error("Unclosed tag at " + M.pos);if (k = ">" == E ? [E, I, A, M.pos, C, T, u] : [E, I, A, M.pos], T++, m.push(k), "#" === E || "^" === E) _.push(k);else if ("/" === E) {
            if (!(x = _.pop())) throw new Error('Unopened section "' + I + '" at ' + A);if (x[1] !== I) throw new Error('Unclosed section "' + x[1] + '" at ' + A);
          } else "name" === E || "{" === E || "&" === E ? b = !0 : "=" === E && S(I);
        }if (w(), x = _.pop()) throw new Error('Unclosed section "' + x[1] + '" at ' + M.pos);return function (e) {
          for (var t, n = [], r = n, i = [], o = 0, s = e.length; o < s; ++o) {
            switch ((t = e[o])[0]) {case "#":case "^":
                r.push(t), i.push(t), r = t[4] = [];break;case "/":
                i.pop()[5] = t[2], r = i.length > 0 ? i[i.length - 1][4] : n;break;default:
                r.push(t);}
          }return n;
        }(function (e) {
          for (var t, n, r = [], i = 0, o = e.length; i < o; ++i) {
            (t = e[i]) && ("text" === t[0] && n && "text" === n[0] ? (n[1] += t[1], n[3] = t[3]) : (r.push(t), n = t));
          }return r;
        }(m));
      }(t, r)), a;
    }, m.prototype.render = function (e, t, n, r) {
      var i = this.parse(e, r),
          o = t instanceof _ ? t : new _(t);return this.renderTokens(i, o, n, e, r);
    }, m.prototype.renderTokens = function (e, t, n, r, i) {
      for (var o, s, a, l = "", u = 0, c = e.length; u < c; ++u) {
        a = void 0, "#" === (s = (o = e[u])[0]) ? a = this.renderSection(o, t, n, r) : "^" === s ? a = this.renderInverted(o, t, n, r) : ">" === s ? a = this.renderPartial(o, t, n, i) : "&" === s ? a = this.unescapedValue(o, t) : "name" === s ? a = this.escapedValue(o, t) : "text" === s && (a = this.rawValue(o)), void 0 !== a && (l += a);
      }return l;
    }, m.prototype.renderSection = function (e, t, i, o) {
      var s = this,
          a = "",
          l = t.lookup(e[1]);if (l) {
        if (n(l)) for (var u = 0, c = l.length; u < c; ++u) {
          a += this.renderTokens(e[4], t.push(l[u]), i, o);
        } else if ("object" == (typeof l === "undefined" ? "undefined" : (0, _typeof3.default)(l)) || "string" == typeof l || "number" == typeof l) a += this.renderTokens(e[4], t.push(l), i, o);else if (r(l)) {
          if ("string" != typeof o) throw new Error("Cannot use higher-order sections without the original template");null != (l = l.call(t.view, o.slice(e[3], e[5]), function (e) {
            return s.render(e, t, i);
          })) && (a += l);
        } else a += this.renderTokens(e[4], t, i, o);return a;
      }
    }, m.prototype.renderInverted = function (e, t, r, i) {
      var o = t.lookup(e[1]);if (!o || n(o) && 0 === o.length) return this.renderTokens(e[4], t, r, i);
    }, m.prototype.indentPartial = function (e, t, n) {
      for (var r = t.replace(/[^ \t]/g, ""), i = e.split("\n"), o = 0; o < i.length; o++) {
        i[o].length && (o > 0 || !n) && (i[o] = r + i[o]);
      }return i.join("\n");
    }, m.prototype.renderPartial = function (e, t, n, i) {
      if (n) {
        var o = r(n) ? n(e[1]) : n[e[1]];if (null != o) {
          var s = e[6],
              a = e[5],
              l = e[4],
              u = o;return 0 == a && l && (u = this.indentPartial(o, l, s)), this.renderTokens(this.parse(u, i), t, n, u);
        }
      }
    }, m.prototype.unescapedValue = function (e, t) {
      var n = t.lookup(e[1]);if (null != n) return n;
    }, m.prototype.escapedValue = function (t, n) {
      var r = n.lookup(t[1]);if (null != r) return e.escape(r);
    }, m.prototype.rawValue = function (e) {
      return e[1];
    }, e.name = "mustache.js", e.version = "3.1.0", e.tags = ["{{", "}}"];var v = new m();return e.clearCache = function () {
      return v.clearCache();
    }, e.parse = function (e, t) {
      return v.parse(e, t);
    }, e.render = function (e, t, r, i) {
      if ("string" != typeof e) throw new TypeError('Invalid template! Template should be a "string" but "' + (n(o = e) ? "array" : typeof o === "undefined" ? "undefined" : (0, _typeof3.default)(o)) + '" was given as the first argument for mustache#render(template, view, partials)');var o;return v.render(e, t, r, i);
    }, e.to_html = function (t, n, i, o) {
      var s = e.render(t, n, i);if (!r(o)) return s;o(s);
    }, e.escape = function (e) {
      return String(e).replace(/[&<>"'`=\/]/g, function (e) {
        return u[e];
      });
    }, e.Scanner = g, e.Context = _, e.Writer = m, e;
  }, t && "string" != typeof t.nodeName ? s(t) : (i = [t], void 0 === (o = "function" == typeof (r = s) ? r.apply(t, i) : r) || (e.exports = o));
}, function (e, t, n) {
  "use strict";
  var r = n(50);e.exports = function (e) {
    var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    if (!Number.isFinite(e)) throw new TypeError("Expected a finite number");t.colonNotation && (t.compact = !1, t.formatSubMilliseconds = !1, t.separateMilliseconds = !1, t.verbose = !1), t.compact && (t.secondsDecimalDigits = 0, t.millisecondsDecimalDigits = 0);var n = [],
        i = function i(e, r, _i2, o) {
      if (!(0 !== n.length && t.colonNotation || 0 !== e || t.colonNotation && "m" === _i2)) return;var s = void 0,
          a = void 0;if (o = (o || e || "0").toString(), t.colonNotation) {
        s = n.length > 0 ? ":" : "", a = "";var _e10 = o.includes(".") ? o.split(".")[0].length : o.length,
            _t2 = n.length > 0 ? 2 : 1;o = "0".repeat(Math.max(0, _t2 - _e10)) + o;
      } else s = "", a = t.verbose ? " " + (l = r, 1 === e ? l : l + "s") : _i2;var l;n.push(s + o + a);
    },
        o = r(e);if (i(Math.trunc(o.days / 365), "year", "y"), i(o.days % 365, "day", "d"), i(o.hours, "hour", "h"), i(o.minutes, "minute", "m"), t.separateMilliseconds || t.formatSubMilliseconds || e < 1e3) {
      if (i(o.seconds, "second", "s"), t.formatSubMilliseconds) i(o.milliseconds, "millisecond", "ms"), i(o.microseconds, "microsecond", "µs"), i(o.nanoseconds, "nanosecond", "ns");else {
        var _e11 = o.milliseconds + o.microseconds / 1e3 + o.nanoseconds / 1e6,
            _n6 = "number" == typeof t.millisecondsDecimalDigits ? t.millisecondsDecimalDigits : 0,
            _r2 = _e11 >= 1 ? Math.round(_e11) : Math.ceil(_e11),
            s = _n6 ? _e11.toFixed(_n6) : _r2;i(Number.parseFloat(s, 10), "millisecond", "ms", s);
      }
    } else {
      var _n7 = function (e, t) {
        var n = Math.floor(e * Math.pow(10, t) + 1e-7);return (Math.round(n) / Math.pow(10, t)).toFixed(t);
      }(e / 1e3 % 60, "number" == typeof t.secondsDecimalDigits ? t.secondsDecimalDigits : 1),
          _r3 = t.keepDecimalsOnWholeSeconds ? _n7 : _n7.replace(/\.0+$/, "");i(Number.parseFloat(_r3, 10), "second", "s", _r3);
    }if (0 === n.length) return "0" + (t.verbose ? " milliseconds" : "ms");if (t.compact) return n[0];if ("number" == typeof t.unitCount) {
      var _e12 = t.colonNotation ? "" : " ";return n.slice(0, Math.max(t.unitCount, 1)).join(_e12);
    }return t.colonNotation ? n.join("") : n.join(" ");
  };
}, function (e, t, n) {
  "use strict";
  Object.defineProperty(t, "__esModule", { value: !0 });var r = n(51);t.Mutex = r.default;
}, function (e, t, n) {
  "use strict";
  var r = n(8);function i(e, t, n, i, o) {
    var s = r.writeRtpDescription(e.kind, t);if (s += r.writeIceParameters(e.iceGatherer.getLocalParameters()), s += r.writeDtlsParameters(e.dtlsTransport.getLocalParameters(), "offer" === n ? "actpass" : o || "active"), s += "a=mid:" + e.mid + "\r\n", e.rtpSender && e.rtpReceiver ? s += "a=sendrecv\r\n" : e.rtpSender ? s += "a=sendonly\r\n" : e.rtpReceiver ? s += "a=recvonly\r\n" : s += "a=inactive\r\n", e.rtpSender) {
      var a = e.rtpSender._initialTrackId || e.rtpSender.track.id;e.rtpSender._initialTrackId = a;var l = "msid:" + (i ? i.id : "-") + " " + a + "\r\n";s += "a=" + l, s += "a=ssrc:" + e.sendEncodingParameters[0].ssrc + " " + l, e.sendEncodingParameters[0].rtx && (s += "a=ssrc:" + e.sendEncodingParameters[0].rtx.ssrc + " " + l, s += "a=ssrc-group:FID " + e.sendEncodingParameters[0].ssrc + " " + e.sendEncodingParameters[0].rtx.ssrc + "\r\n");
    }return s += "a=ssrc:" + e.sendEncodingParameters[0].ssrc + " cname:" + r.localCName + "\r\n", e.rtpSender && e.sendEncodingParameters[0].rtx && (s += "a=ssrc:" + e.sendEncodingParameters[0].rtx.ssrc + " cname:" + r.localCName + "\r\n"), s;
  }function o(e, t) {
    var n = { codecs: [], headerExtensions: [], fecMechanisms: [] },
        r = function r(e, t) {
      e = parseInt(e, 10);for (var n = 0; n < t.length; n++) {
        if (t[n].payloadType === e || t[n].preferredPayloadType === e) return t[n];
      }
    },
        i = function i(e, t, n, _i3) {
      var o = r(e.parameters.apt, n),
          s = r(t.parameters.apt, _i3);return o && s && o.name.toLowerCase() === s.name.toLowerCase();
    };return e.codecs.forEach(function (r) {
      for (var o = 0; o < t.codecs.length; o++) {
        var s = t.codecs[o];if (r.name.toLowerCase() === s.name.toLowerCase() && r.clockRate === s.clockRate) {
          if ("rtx" === r.name.toLowerCase() && r.parameters && s.parameters.apt && !i(r, s, e.codecs, t.codecs)) continue;(s = JSON.parse(JSON.stringify(s))).numChannels = Math.min(r.numChannels, s.numChannels), n.codecs.push(s), s.rtcpFeedback = s.rtcpFeedback.filter(function (e) {
            for (var t = 0; t < r.rtcpFeedback.length; t++) {
              if (r.rtcpFeedback[t].type === e.type && r.rtcpFeedback[t].parameter === e.parameter) return !0;
            }return !1;
          });break;
        }
      }
    }), e.headerExtensions.forEach(function (e) {
      for (var r = 0; r < t.headerExtensions.length; r++) {
        var i = t.headerExtensions[r];if (e.uri === i.uri) {
          n.headerExtensions.push(i);break;
        }
      }
    }), n;
  }function s(e, t, n) {
    return -1 !== { offer: { setLocalDescription: ["stable", "have-local-offer"], setRemoteDescription: ["stable", "have-remote-offer"] }, answer: { setLocalDescription: ["have-remote-offer", "have-local-pranswer"], setRemoteDescription: ["have-local-offer", "have-remote-pranswer"] } }[t][e].indexOf(n);
  }function a(e, t) {
    var n = e.getRemoteCandidates().find(function (e) {
      return t.foundation === e.foundation && t.ip === e.ip && t.port === e.port && t.priority === e.priority && t.protocol === e.protocol && t.type === e.type;
    });return n || e.addRemoteCandidate(t), !n;
  }function l(e, t) {
    var n = new Error(t);return n.name = e, n.code = { NotSupportedError: 9, InvalidStateError: 11, InvalidAccessError: 15, TypeError: void 0, OperationError: void 0 }[e], n;
  }e.exports = function (e, t) {
    function n(t, n) {
      n.addTrack(t), n.dispatchEvent(new e.MediaStreamTrackEvent("addtrack", { track: t }));
    }function u(t, n, r, i) {
      var o = new Event("track");o.track = n, o.receiver = r, o.transceiver = { receiver: r }, o.streams = i, e.setTimeout(function () {
        t._dispatchEvent("track", o);
      });
    }var c = function c(n) {
      var i = this,
          o = document.createDocumentFragment();if (["addEventListener", "removeEventListener", "dispatchEvent"].forEach(function (e) {
        i[e] = o[e].bind(o);
      }), this.canTrickleIceCandidates = null, this.needNegotiation = !1, this.localStreams = [], this.remoteStreams = [], this._localDescription = null, this._remoteDescription = null, this.signalingState = "stable", this.iceConnectionState = "new", this.connectionState = "new", this.iceGatheringState = "new", n = JSON.parse(JSON.stringify(n || {})), this.usingBundle = "max-bundle" === n.bundlePolicy, "negotiate" === n.rtcpMuxPolicy) throw l("NotSupportedError", "rtcpMuxPolicy 'negotiate' is not supported");switch (n.rtcpMuxPolicy || (n.rtcpMuxPolicy = "require"), n.iceTransportPolicy) {case "all":case "relay":
          break;default:
          n.iceTransportPolicy = "all";}switch (n.bundlePolicy) {case "balanced":case "max-compat":case "max-bundle":
          break;default:
          n.bundlePolicy = "balanced";}if (n.iceServers = function (e, t) {
        var n = !1;return (e = JSON.parse(JSON.stringify(e))).filter(function (e) {
          if (e && (e.urls || e.url)) {
            var r = e.urls || e.url;e.url && !e.urls && console.warn("RTCIceServer.url is deprecated! Use urls instead.");var i = "string" == typeof r;return i && (r = [r]), r = r.filter(function (e) {
              return 0 !== e.indexOf("turn:") || -1 === e.indexOf("transport=udp") || -1 !== e.indexOf("turn:[") || n ? 0 === e.indexOf("stun:") && t >= 14393 && -1 === e.indexOf("?transport=udp") : (n = !0, !0);
            }), delete e.url, e.urls = i ? r[0] : r, !!r.length;
          }
        });
      }(n.iceServers || [], t), this._iceGatherers = [], n.iceCandidatePoolSize) for (var s = n.iceCandidatePoolSize; s > 0; s--) {
        this._iceGatherers.push(new e.RTCIceGatherer({ iceServers: n.iceServers, gatherPolicy: n.iceTransportPolicy }));
      } else n.iceCandidatePoolSize = 0;this._config = n, this.transceivers = [], this._sdpSessionId = r.generateSessionId(), this._sdpSessionVersion = 0, this._dtlsRole = void 0, this._isClosed = !1;
    };Object.defineProperty(c.prototype, "localDescription", { configurable: !0, get: function get() {
        return this._localDescription;
      } }), Object.defineProperty(c.prototype, "remoteDescription", { configurable: !0, get: function get() {
        return this._remoteDescription;
      } }), c.prototype.onicecandidate = null, c.prototype.onaddstream = null, c.prototype.ontrack = null, c.prototype.onremovestream = null, c.prototype.onsignalingstatechange = null, c.prototype.oniceconnectionstatechange = null, c.prototype.onconnectionstatechange = null, c.prototype.onicegatheringstatechange = null, c.prototype.onnegotiationneeded = null, c.prototype.ondatachannel = null, c.prototype._dispatchEvent = function (e, t) {
      this._isClosed || (this.dispatchEvent(t), "function" == typeof this["on" + e] && this["on" + e](t));
    }, c.prototype._emitGatheringStateChange = function () {
      var e = new Event("icegatheringstatechange");this._dispatchEvent("icegatheringstatechange", e);
    }, c.prototype.getConfiguration = function () {
      return this._config;
    }, c.prototype.getLocalStreams = function () {
      return this.localStreams;
    }, c.prototype.getRemoteStreams = function () {
      return this.remoteStreams;
    }, c.prototype._createTransceiver = function (e, t) {
      var n = this.transceivers.length > 0,
          r = { track: null, iceGatherer: null, iceTransport: null, dtlsTransport: null, localCapabilities: null, remoteCapabilities: null, rtpSender: null, rtpReceiver: null, kind: e, mid: null, sendEncodingParameters: null, recvEncodingParameters: null, stream: null, associatedRemoteMediaStreams: [], wantReceive: !0 };if (this.usingBundle && n) r.iceTransport = this.transceivers[0].iceTransport, r.dtlsTransport = this.transceivers[0].dtlsTransport;else {
        var i = this._createIceAndDtlsTransports();r.iceTransport = i.iceTransport, r.dtlsTransport = i.dtlsTransport;
      }return t || this.transceivers.push(r), r;
    }, c.prototype.addTrack = function (t, n) {
      if (this._isClosed) throw l("InvalidStateError", "Attempted to call addTrack on a closed peerconnection.");var r;if (this.transceivers.find(function (e) {
        return e.track === t;
      })) throw l("InvalidAccessError", "Track already exists.");for (var i = 0; i < this.transceivers.length; i++) {
        this.transceivers[i].track || this.transceivers[i].kind !== t.kind || (r = this.transceivers[i]);
      }return r || (r = this._createTransceiver(t.kind)), this._maybeFireNegotiationNeeded(), -1 === this.localStreams.indexOf(n) && this.localStreams.push(n), r.track = t, r.stream = n, r.rtpSender = new e.RTCRtpSender(t, r.dtlsTransport), r.rtpSender;
    }, c.prototype.addStream = function (e) {
      var n = this;if (t >= 15025) e.getTracks().forEach(function (t) {
        n.addTrack(t, e);
      });else {
        var r = e.clone();e.getTracks().forEach(function (e, t) {
          var n = r.getTracks()[t];e.addEventListener("enabled", function (e) {
            n.enabled = e.enabled;
          });
        }), r.getTracks().forEach(function (e) {
          n.addTrack(e, r);
        });
      }
    }, c.prototype.removeTrack = function (t) {
      if (this._isClosed) throw l("InvalidStateError", "Attempted to call removeTrack on a closed peerconnection.");if (!(t instanceof e.RTCRtpSender)) throw new TypeError("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.");var n = this.transceivers.find(function (e) {
        return e.rtpSender === t;
      });if (!n) throw l("InvalidAccessError", "Sender was not created by this connection.");var r = n.stream;n.rtpSender.stop(), n.rtpSender = null, n.track = null, n.stream = null, -1 === this.transceivers.map(function (e) {
        return e.stream;
      }).indexOf(r) && this.localStreams.indexOf(r) > -1 && this.localStreams.splice(this.localStreams.indexOf(r), 1), this._maybeFireNegotiationNeeded();
    }, c.prototype.removeStream = function (e) {
      var t = this;e.getTracks().forEach(function (e) {
        var n = t.getSenders().find(function (t) {
          return t.track === e;
        });n && t.removeTrack(n);
      });
    }, c.prototype.getSenders = function () {
      return this.transceivers.filter(function (e) {
        return !!e.rtpSender;
      }).map(function (e) {
        return e.rtpSender;
      });
    }, c.prototype.getReceivers = function () {
      return this.transceivers.filter(function (e) {
        return !!e.rtpReceiver;
      }).map(function (e) {
        return e.rtpReceiver;
      });
    }, c.prototype._createIceGatherer = function (t, n) {
      var r = this;if (n && t > 0) return this.transceivers[0].iceGatherer;if (this._iceGatherers.length) return this._iceGatherers.shift();var i = new e.RTCIceGatherer({ iceServers: this._config.iceServers, gatherPolicy: this._config.iceTransportPolicy });return Object.defineProperty(i, "state", { value: "new", writable: !0 }), this.transceivers[t].bufferedCandidateEvents = [], this.transceivers[t].bufferCandidates = function (e) {
        var n = !e.candidate || 0 === Object.keys(e.candidate).length;i.state = n ? "completed" : "gathering", null !== r.transceivers[t].bufferedCandidateEvents && r.transceivers[t].bufferedCandidateEvents.push(e);
      }, i.addEventListener("localcandidate", this.transceivers[t].bufferCandidates), i;
    }, c.prototype._gather = function (t, n) {
      var i = this,
          o = this.transceivers[n].iceGatherer;if (!o.onlocalcandidate) {
        var s = this.transceivers[n].bufferedCandidateEvents;this.transceivers[n].bufferedCandidateEvents = null, o.removeEventListener("localcandidate", this.transceivers[n].bufferCandidates), o.onlocalcandidate = function (e) {
          if (!(i.usingBundle && n > 0)) {
            var s = new Event("icecandidate");s.candidate = { sdpMid: t, sdpMLineIndex: n };var a = e.candidate,
                l = !a || 0 === Object.keys(a).length;if (l) "new" !== o.state && "gathering" !== o.state || (o.state = "completed");else {
              "new" === o.state && (o.state = "gathering"), a.component = 1, a.ufrag = o.getLocalParameters().usernameFragment;var u = r.writeCandidate(a);s.candidate = Object.assign(s.candidate, r.parseCandidate(u)), s.candidate.candidate = u, s.candidate.toJSON = function () {
                return { candidate: s.candidate.candidate, sdpMid: s.candidate.sdpMid, sdpMLineIndex: s.candidate.sdpMLineIndex, usernameFragment: s.candidate.usernameFragment };
              };
            }var c = r.getMediaSections(i._localDescription.sdp);c[s.candidate.sdpMLineIndex] += l ? "a=end-of-candidates\r\n" : "a=" + s.candidate.candidate + "\r\n", i._localDescription.sdp = r.getDescription(i._localDescription.sdp) + c.join("");var d = i.transceivers.every(function (e) {
              return e.iceGatherer && "completed" === e.iceGatherer.state;
            });"gathering" !== i.iceGatheringState && (i.iceGatheringState = "gathering", i._emitGatheringStateChange()), l || i._dispatchEvent("icecandidate", s), d && (i._dispatchEvent("icecandidate", new Event("icecandidate")), i.iceGatheringState = "complete", i._emitGatheringStateChange());
          }
        }, e.setTimeout(function () {
          s.forEach(function (e) {
            o.onlocalcandidate(e);
          });
        }, 0);
      }
    }, c.prototype._createIceAndDtlsTransports = function () {
      var t = this,
          n = new e.RTCIceTransport(null);n.onicestatechange = function () {
        t._updateIceConnectionState(), t._updateConnectionState();
      };var r = new e.RTCDtlsTransport(n);return r.ondtlsstatechange = function () {
        t._updateConnectionState();
      }, r.onerror = function () {
        Object.defineProperty(r, "state", { value: "failed", writable: !0 }), t._updateConnectionState();
      }, { iceTransport: n, dtlsTransport: r };
    }, c.prototype._disposeIceAndDtlsTransports = function (e) {
      var t = this.transceivers[e].iceGatherer;t && (delete t.onlocalcandidate, delete this.transceivers[e].iceGatherer);var n = this.transceivers[e].iceTransport;n && (delete n.onicestatechange, delete this.transceivers[e].iceTransport);var r = this.transceivers[e].dtlsTransport;r && (delete r.ondtlsstatechange, delete r.onerror, delete this.transceivers[e].dtlsTransport);
    }, c.prototype._transceive = function (e, n, i) {
      var s = o(e.localCapabilities, e.remoteCapabilities);n && e.rtpSender && (s.encodings = e.sendEncodingParameters, s.rtcp = { cname: r.localCName, compound: e.rtcpParameters.compound }, e.recvEncodingParameters.length && (s.rtcp.ssrc = e.recvEncodingParameters[0].ssrc), e.rtpSender.send(s)), i && e.rtpReceiver && s.codecs.length > 0 && ("video" === e.kind && e.recvEncodingParameters && t < 15019 && e.recvEncodingParameters.forEach(function (e) {
        delete e.rtx;
      }), e.recvEncodingParameters.length ? s.encodings = e.recvEncodingParameters : s.encodings = [{}], s.rtcp = { compound: e.rtcpParameters.compound }, e.rtcpParameters.cname && (s.rtcp.cname = e.rtcpParameters.cname), e.sendEncodingParameters.length && (s.rtcp.ssrc = e.sendEncodingParameters[0].ssrc), e.rtpReceiver.receive(s));
    }, c.prototype.setLocalDescription = function (e) {
      var t,
          n,
          i = this;if (-1 === ["offer", "answer"].indexOf(e.type)) return Promise.reject(l("TypeError", 'Unsupported type "' + e.type + '"'));if (!s("setLocalDescription", e.type, i.signalingState) || i._isClosed) return Promise.reject(l("InvalidStateError", "Can not set local " + e.type + " in state " + i.signalingState));if ("offer" === e.type) t = r.splitSections(e.sdp), n = t.shift(), t.forEach(function (e, t) {
        var n = r.parseRtpParameters(e);i.transceivers[t].localCapabilities = n;
      }), i.transceivers.forEach(function (e, t) {
        i._gather(e.mid, t);
      });else if ("answer" === e.type) {
        t = r.splitSections(i._remoteDescription.sdp), n = t.shift();var a = r.matchPrefix(n, "a=ice-lite").length > 0;t.forEach(function (e, t) {
          var s = i.transceivers[t],
              l = s.iceGatherer,
              u = s.iceTransport,
              c = s.dtlsTransport,
              d = s.localCapabilities,
              h = s.remoteCapabilities;if ((!r.isRejected(e) || 0 !== r.matchPrefix(e, "a=bundle-only").length) && !s.rejected) {
            var f = r.getIceParameters(e, n),
                p = r.getDtlsParameters(e, n);a && (p.role = "server"), i.usingBundle && 0 !== t || (i._gather(s.mid, t), "new" === u.state && u.start(l, f, a ? "controlling" : "controlled"), "new" === c.state && c.start(p));var g = o(d, h);i._transceive(s, g.codecs.length > 0, !1);
          }
        });
      }return i._localDescription = { type: e.type, sdp: e.sdp }, "offer" === e.type ? i._updateSignalingState("have-local-offer") : i._updateSignalingState("stable"), Promise.resolve();
    }, c.prototype.setRemoteDescription = function (i) {
      var c = this;if (-1 === ["offer", "answer"].indexOf(i.type)) return Promise.reject(l("TypeError", 'Unsupported type "' + i.type + '"'));if (!s("setRemoteDescription", i.type, c.signalingState) || c._isClosed) return Promise.reject(l("InvalidStateError", "Can not set remote " + i.type + " in state " + c.signalingState));var d = {};c.remoteStreams.forEach(function (e) {
        d[e.id] = e;
      });var h = [],
          f = r.splitSections(i.sdp),
          p = f.shift(),
          g = r.matchPrefix(p, "a=ice-lite").length > 0,
          _ = r.matchPrefix(p, "a=group:BUNDLE ").length > 0;c.usingBundle = _;var m = r.matchPrefix(p, "a=ice-options:")[0];return c.canTrickleIceCandidates = !!m && m.substr(14).split(" ").indexOf("trickle") >= 0, f.forEach(function (s, l) {
        var u = r.splitLines(s),
            f = r.getKind(s),
            m = r.isRejected(s) && 0 === r.matchPrefix(s, "a=bundle-only").length,
            v = u[0].substr(2).split(" ")[2],
            y = r.getDirection(s, p),
            b = r.parseMsid(s),
            C = r.getMid(s) || r.generateIdentifier();if (m || "application" === f && ("DTLS/SCTP" === v || "UDP/DTLS/SCTP" === v)) c.transceivers[l] = { mid: C, kind: f, protocol: v, rejected: !0 };else {
          var T, w, S, A, E, I, R, k, x;!m && c.transceivers[l] && c.transceivers[l].rejected && (c.transceivers[l] = c._createTransceiver(f, !0));var M,
              D,
              O = r.parseRtpParameters(s);m || (M = r.getIceParameters(s, p), (D = r.getDtlsParameters(s, p)).role = "client"), R = r.parseRtpEncodingParameters(s);var L = r.parseRtcpParameters(s),
              P = r.matchPrefix(s, "a=end-of-candidates", p).length > 0,
              N = r.matchPrefix(s, "a=candidate:").map(function (e) {
            return r.parseCandidate(e);
          }).filter(function (e) {
            return 1 === e.component;
          });if (("offer" === i.type || "answer" === i.type) && !m && _ && l > 0 && c.transceivers[l] && (c._disposeIceAndDtlsTransports(l), c.transceivers[l].iceGatherer = c.transceivers[0].iceGatherer, c.transceivers[l].iceTransport = c.transceivers[0].iceTransport, c.transceivers[l].dtlsTransport = c.transceivers[0].dtlsTransport, c.transceivers[l].rtpSender && c.transceivers[l].rtpSender.setTransport(c.transceivers[0].dtlsTransport), c.transceivers[l].rtpReceiver && c.transceivers[l].rtpReceiver.setTransport(c.transceivers[0].dtlsTransport)), "offer" !== i.type || m) "answer" !== i.type || m || (w = (T = c.transceivers[l]).iceGatherer, S = T.iceTransport, A = T.dtlsTransport, E = T.rtpReceiver, I = T.sendEncodingParameters, k = T.localCapabilities, c.transceivers[l].recvEncodingParameters = R, c.transceivers[l].remoteCapabilities = O, c.transceivers[l].rtcpParameters = L, N.length && "new" === S.state && (!g && !P || _ && 0 !== l ? N.forEach(function (e) {
            a(T.iceTransport, e);
          }) : S.setRemoteCandidates(N)), _ && 0 !== l || ("new" === S.state && S.start(w, M, "controlling"), "new" === A.state && A.start(D)), !o(T.localCapabilities, T.remoteCapabilities).codecs.filter(function (e) {
            return "rtx" === e.name.toLowerCase();
          }).length && T.sendEncodingParameters[0].rtx && delete T.sendEncodingParameters[0].rtx, c._transceive(T, "sendrecv" === y || "recvonly" === y, "sendrecv" === y || "sendonly" === y), !E || "sendrecv" !== y && "sendonly" !== y ? delete T.rtpReceiver : (x = E.track, b ? (d[b.stream] || (d[b.stream] = new e.MediaStream()), n(x, d[b.stream]), h.push([x, E, d[b.stream]])) : (d.default || (d.default = new e.MediaStream()), n(x, d.default), h.push([x, E, d.default]))));else {
            (T = c.transceivers[l] || c._createTransceiver(f)).mid = C, T.iceGatherer || (T.iceGatherer = c._createIceGatherer(l, _)), N.length && "new" === T.iceTransport.state && (!P || _ && 0 !== l ? N.forEach(function (e) {
              a(T.iceTransport, e);
            }) : T.iceTransport.setRemoteCandidates(N)), k = e.RTCRtpReceiver.getCapabilities(f), t < 15019 && (k.codecs = k.codecs.filter(function (e) {
              return "rtx" !== e.name;
            })), I = T.sendEncodingParameters || [{ ssrc: 1001 * (2 * l + 2) }];var j,
                U = !1;"sendrecv" === y || "sendonly" === y ? (U = !T.rtpReceiver, E = T.rtpReceiver || new e.RTCRtpReceiver(T.dtlsTransport, f), U && (x = E.track, b && "-" === b.stream || (b ? (d[b.stream] || (d[b.stream] = new e.MediaStream(), Object.defineProperty(d[b.stream], "id", { get: function get() {
                return b.stream;
              } })), Object.defineProperty(x, "id", { get: function get() {
                return b.track;
              } }), j = d[b.stream]) : (d.default || (d.default = new e.MediaStream()), j = d.default)), j && (n(x, j), T.associatedRemoteMediaStreams.push(j)), h.push([x, E, j]))) : T.rtpReceiver && T.rtpReceiver.track && (T.associatedRemoteMediaStreams.forEach(function (t) {
              var n = t.getTracks().find(function (e) {
                return e.id === T.rtpReceiver.track.id;
              });n && function (t, n) {
                n.removeTrack(t), n.dispatchEvent(new e.MediaStreamTrackEvent("removetrack", { track: t }));
              }(n, t);
            }), T.associatedRemoteMediaStreams = []), T.localCapabilities = k, T.remoteCapabilities = O, T.rtpReceiver = E, T.rtcpParameters = L, T.sendEncodingParameters = I, T.recvEncodingParameters = R, c._transceive(c.transceivers[l], !1, U);
          }
        }
      }), void 0 === c._dtlsRole && (c._dtlsRole = "offer" === i.type ? "active" : "passive"), c._remoteDescription = { type: i.type, sdp: i.sdp }, "offer" === i.type ? c._updateSignalingState("have-remote-offer") : c._updateSignalingState("stable"), Object.keys(d).forEach(function (t) {
        var n = d[t];if (n.getTracks().length) {
          if (-1 === c.remoteStreams.indexOf(n)) {
            c.remoteStreams.push(n);var r = new Event("addstream");r.stream = n, e.setTimeout(function () {
              c._dispatchEvent("addstream", r);
            });
          }h.forEach(function (e) {
            var t = e[0],
                r = e[1];n.id === e[2].id && u(c, t, r, [n]);
          });
        }
      }), h.forEach(function (e) {
        e[2] || u(c, e[0], e[1], []);
      }), e.setTimeout(function () {
        c && c.transceivers && c.transceivers.forEach(function (e) {
          e.iceTransport && "new" === e.iceTransport.state && e.iceTransport.getRemoteCandidates().length > 0 && (console.warn("Timeout for addRemoteCandidate. Consider sending an end-of-candidates notification"), e.iceTransport.addRemoteCandidate({}));
        });
      }, 4e3), Promise.resolve();
    }, c.prototype.close = function () {
      this.transceivers.forEach(function (e) {
        e.iceTransport && e.iceTransport.stop(), e.dtlsTransport && e.dtlsTransport.stop(), e.rtpSender && e.rtpSender.stop(), e.rtpReceiver && e.rtpReceiver.stop();
      }), this._isClosed = !0, this._updateSignalingState("closed");
    }, c.prototype._updateSignalingState = function (e) {
      this.signalingState = e;var t = new Event("signalingstatechange");this._dispatchEvent("signalingstatechange", t);
    }, c.prototype._maybeFireNegotiationNeeded = function () {
      var t = this;"stable" === this.signalingState && !0 !== this.needNegotiation && (this.needNegotiation = !0, e.setTimeout(function () {
        if (t.needNegotiation) {
          t.needNegotiation = !1;var e = new Event("negotiationneeded");t._dispatchEvent("negotiationneeded", e);
        }
      }, 0));
    }, c.prototype._updateIceConnectionState = function () {
      var e,
          t = { new: 0, closed: 0, checking: 0, connected: 0, completed: 0, disconnected: 0, failed: 0 };if (this.transceivers.forEach(function (e) {
        e.iceTransport && !e.rejected && t[e.iceTransport.state]++;
      }), e = "new", t.failed > 0 ? e = "failed" : t.checking > 0 ? e = "checking" : t.disconnected > 0 ? e = "disconnected" : t.new > 0 ? e = "new" : t.connected > 0 ? e = "connected" : t.completed > 0 && (e = "completed"), e !== this.iceConnectionState) {
        this.iceConnectionState = e;var n = new Event("iceconnectionstatechange");this._dispatchEvent("iceconnectionstatechange", n);
      }
    }, c.prototype._updateConnectionState = function () {
      var e,
          t = { new: 0, closed: 0, connecting: 0, connected: 0, completed: 0, disconnected: 0, failed: 0 };if (this.transceivers.forEach(function (e) {
        e.iceTransport && e.dtlsTransport && !e.rejected && (t[e.iceTransport.state]++, t[e.dtlsTransport.state]++);
      }), t.connected += t.completed, e = "new", t.failed > 0 ? e = "failed" : t.connecting > 0 ? e = "connecting" : t.disconnected > 0 ? e = "disconnected" : t.new > 0 ? e = "new" : t.connected > 0 && (e = "connected"), e !== this.connectionState) {
        this.connectionState = e;var n = new Event("connectionstatechange");this._dispatchEvent("connectionstatechange", n);
      }
    }, c.prototype.createOffer = function () {
      var n = this;if (n._isClosed) return Promise.reject(l("InvalidStateError", "Can not call createOffer after close"));var o = n.transceivers.filter(function (e) {
        return "audio" === e.kind;
      }).length,
          s = n.transceivers.filter(function (e) {
        return "video" === e.kind;
      }).length,
          a = arguments[0];if (a) {
        if (a.mandatory || a.optional) throw new TypeError("Legacy mandatory/optional constraints not supported.");void 0 !== a.offerToReceiveAudio && (o = !0 === a.offerToReceiveAudio ? 1 : !1 === a.offerToReceiveAudio ? 0 : a.offerToReceiveAudio), void 0 !== a.offerToReceiveVideo && (s = !0 === a.offerToReceiveVideo ? 1 : !1 === a.offerToReceiveVideo ? 0 : a.offerToReceiveVideo);
      }for (n.transceivers.forEach(function (e) {
        "audio" === e.kind ? --o < 0 && (e.wantReceive = !1) : "video" === e.kind && --s < 0 && (e.wantReceive = !1);
      }); o > 0 || s > 0;) {
        o > 0 && (n._createTransceiver("audio"), o--), s > 0 && (n._createTransceiver("video"), s--);
      }var u = r.writeSessionBoilerplate(n._sdpSessionId, n._sdpSessionVersion++);n.transceivers.forEach(function (i, o) {
        var s = i.track,
            a = i.kind,
            l = i.mid || r.generateIdentifier();i.mid = l, i.iceGatherer || (i.iceGatherer = n._createIceGatherer(o, n.usingBundle));var u = e.RTCRtpSender.getCapabilities(a);t < 15019 && (u.codecs = u.codecs.filter(function (e) {
          return "rtx" !== e.name;
        })), u.codecs.forEach(function (e) {
          "H264" === e.name && void 0 === e.parameters["level-asymmetry-allowed"] && (e.parameters["level-asymmetry-allowed"] = "1"), i.remoteCapabilities && i.remoteCapabilities.codecs && i.remoteCapabilities.codecs.forEach(function (t) {
            e.name.toLowerCase() === t.name.toLowerCase() && e.clockRate === t.clockRate && (e.preferredPayloadType = t.payloadType);
          });
        }), u.headerExtensions.forEach(function (e) {
          (i.remoteCapabilities && i.remoteCapabilities.headerExtensions || []).forEach(function (t) {
            e.uri === t.uri && (e.id = t.id);
          });
        });var c = i.sendEncodingParameters || [{ ssrc: 1001 * (2 * o + 1) }];s && t >= 15019 && "video" === a && !c[0].rtx && (c[0].rtx = { ssrc: c[0].ssrc + 1 }), i.wantReceive && (i.rtpReceiver = new e.RTCRtpReceiver(i.dtlsTransport, a)), i.localCapabilities = u, i.sendEncodingParameters = c;
      }), "max-compat" !== n._config.bundlePolicy && (u += "a=group:BUNDLE " + n.transceivers.map(function (e) {
        return e.mid;
      }).join(" ") + "\r\n"), u += "a=ice-options:trickle\r\n", n.transceivers.forEach(function (e, t) {
        u += i(e, e.localCapabilities, "offer", e.stream, n._dtlsRole), u += "a=rtcp-rsize\r\n", !e.iceGatherer || "new" === n.iceGatheringState || 0 !== t && n.usingBundle || (e.iceGatherer.getLocalCandidates().forEach(function (e) {
          e.component = 1, u += "a=" + r.writeCandidate(e) + "\r\n";
        }), "completed" === e.iceGatherer.state && (u += "a=end-of-candidates\r\n"));
      });var c = new e.RTCSessionDescription({ type: "offer", sdp: u });return Promise.resolve(c);
    }, c.prototype.createAnswer = function () {
      var n = this;if (n._isClosed) return Promise.reject(l("InvalidStateError", "Can not call createAnswer after close"));if ("have-remote-offer" !== n.signalingState && "have-local-pranswer" !== n.signalingState) return Promise.reject(l("InvalidStateError", "Can not call createAnswer in signalingState " + n.signalingState));var s = r.writeSessionBoilerplate(n._sdpSessionId, n._sdpSessionVersion++);n.usingBundle && (s += "a=group:BUNDLE " + n.transceivers.map(function (e) {
        return e.mid;
      }).join(" ") + "\r\n"), s += "a=ice-options:trickle\r\n";var a = r.getMediaSections(n._remoteDescription.sdp).length;n.transceivers.forEach(function (e, r) {
        if (!(r + 1 > a)) {
          if (e.rejected) return "application" === e.kind ? "DTLS/SCTP" === e.protocol ? s += "m=application 0 DTLS/SCTP 5000\r\n" : s += "m=application 0 " + e.protocol + " webrtc-datachannel\r\n" : "audio" === e.kind ? s += "m=audio 0 UDP/TLS/RTP/SAVPF 0\r\na=rtpmap:0 PCMU/8000\r\n" : "video" === e.kind && (s += "m=video 0 UDP/TLS/RTP/SAVPF 120\r\na=rtpmap:120 VP8/90000\r\n"), void (s += "c=IN IP4 0.0.0.0\r\na=inactive\r\na=mid:" + e.mid + "\r\n");var l;e.stream && ("audio" === e.kind ? l = e.stream.getAudioTracks()[0] : "video" === e.kind && (l = e.stream.getVideoTracks()[0]), l && t >= 15019 && "video" === e.kind && !e.sendEncodingParameters[0].rtx && (e.sendEncodingParameters[0].rtx = { ssrc: e.sendEncodingParameters[0].ssrc + 1 }));var u = o(e.localCapabilities, e.remoteCapabilities);!u.codecs.filter(function (e) {
            return "rtx" === e.name.toLowerCase();
          }).length && e.sendEncodingParameters[0].rtx && delete e.sendEncodingParameters[0].rtx, s += i(e, u, "answer", e.stream, n._dtlsRole), e.rtcpParameters && e.rtcpParameters.reducedSize && (s += "a=rtcp-rsize\r\n");
        }
      });var u = new e.RTCSessionDescription({ type: "answer", sdp: s });return Promise.resolve(u);
    }, c.prototype.addIceCandidate = function (e) {
      var t,
          n = this;return e && void 0 === e.sdpMLineIndex && !e.sdpMid ? Promise.reject(new TypeError("sdpMLineIndex or sdpMid required")) : new Promise(function (i, o) {
        if (!n._remoteDescription) return o(l("InvalidStateError", "Can not add ICE candidate without a remote description"));if (e && "" !== e.candidate) {
          var s = e.sdpMLineIndex;if (e.sdpMid) for (var u = 0; u < n.transceivers.length; u++) {
            if (n.transceivers[u].mid === e.sdpMid) {
              s = u;break;
            }
          }var c = n.transceivers[s];if (!c) return o(l("OperationError", "Can not add ICE candidate"));if (c.rejected) return i();var d = Object.keys(e.candidate).length > 0 ? r.parseCandidate(e.candidate) : {};if ("tcp" === d.protocol && (0 === d.port || 9 === d.port)) return i();if (d.component && 1 !== d.component) return i();if ((0 === s || s > 0 && c.iceTransport !== n.transceivers[0].iceTransport) && !a(c.iceTransport, d)) return o(l("OperationError", "Can not add ICE candidate"));var h = e.candidate.trim();0 === h.indexOf("a=") && (h = h.substr(2)), (t = r.getMediaSections(n._remoteDescription.sdp))[s] += "a=" + (d.type ? h : "end-of-candidates") + "\r\n", n._remoteDescription.sdp = r.getDescription(n._remoteDescription.sdp) + t.join("");
        } else for (var f = 0; f < n.transceivers.length && (n.transceivers[f].rejected || (n.transceivers[f].iceTransport.addRemoteCandidate({}), (t = r.getMediaSections(n._remoteDescription.sdp))[f] += "a=end-of-candidates\r\n", n._remoteDescription.sdp = r.getDescription(n._remoteDescription.sdp) + t.join(""), !n.usingBundle)); f++) {}i();
      });
    }, c.prototype.getStats = function (t) {
      if (t && t instanceof e.MediaStreamTrack) {
        var n = null;if (this.transceivers.forEach(function (e) {
          e.rtpSender && e.rtpSender.track === t ? n = e.rtpSender : e.rtpReceiver && e.rtpReceiver.track === t && (n = e.rtpReceiver);
        }), !n) throw l("InvalidAccessError", "Invalid selector.");return n.getStats();
      }var r = [];return this.transceivers.forEach(function (e) {
        ["rtpSender", "rtpReceiver", "iceGatherer", "iceTransport", "dtlsTransport"].forEach(function (t) {
          e[t] && r.push(e[t].getStats());
        });
      }), Promise.all(r).then(function (e) {
        var t = new Map();return e.forEach(function (e) {
          e.forEach(function (e) {
            t.set(e.id, e);
          });
        }), t;
      });
    }, ["RTCRtpSender", "RTCRtpReceiver", "RTCIceGatherer", "RTCIceTransport", "RTCDtlsTransport"].forEach(function (t) {
      var n = e[t];if (n && n.prototype && n.prototype.getStats) {
        var r = n.prototype.getStats;n.prototype.getStats = function () {
          return r.apply(this).then(function (e) {
            var t = new Map();return Object.keys(e).forEach(function (n) {
              var r;e[n].type = { inboundrtp: "inbound-rtp", outboundrtp: "outbound-rtp", candidatepair: "candidate-pair", localcandidate: "local-candidate", remotecandidate: "remote-candidate" }[(r = e[n]).type] || r.type, t.set(n, e[n]);
            }), t;
          });
        };
      }
    });var d = ["createOffer", "createAnswer"];return d.forEach(function (e) {
      var t = c.prototype[e];c.prototype[e] = function () {
        var e = arguments;return "function" == typeof e[0] || "function" == typeof e[1] ? t.apply(this, [arguments[2]]).then(function (t) {
          "function" == typeof e[0] && e[0].apply(null, [t]);
        }, function (t) {
          "function" == typeof e[1] && e[1].apply(null, [t]);
        }) : t.apply(this, arguments);
      };
    }), (d = ["setLocalDescription", "setRemoteDescription", "addIceCandidate"]).forEach(function (e) {
      var t = c.prototype[e];c.prototype[e] = function () {
        var e = arguments;return "function" == typeof e[1] || "function" == typeof e[2] ? t.apply(this, arguments).then(function () {
          "function" == typeof e[1] && e[1].apply(null);
        }, function (t) {
          "function" == typeof e[2] && e[2].apply(null, [t]);
        }) : t.apply(this, arguments);
      };
    }), ["getStats"].forEach(function (e) {
      var t = c.prototype[e];c.prototype[e] = function () {
        var e = arguments;return "function" == typeof e[1] ? t.apply(this, arguments).then(function () {
          "function" == typeof e[1] && e[1].apply(null);
        }) : t.apply(this, arguments);
      };
    }), c;
  };
}, function (e, t, n) {
  var r = n(52).default;e.exports = r;
}, function (e, t) {
  var n;n = function () {
    return this;
  }();try {
    n = n || new Function("return this")();
  } catch (e) {
    "object" == (typeof window === "undefined" ? "undefined" : (0, _typeof3.default)(window)) && (n = window);
  }e.exports = n;
}, function (e, t) {
  e.exports = function (e) {
    return e.webpackPolyfill || (e.deprecate = function () {}, e.paths = [], e.children || (e.children = []), Object.defineProperty(e, "loaded", { enumerable: !0, get: function get() {
        return e.l;
      } }), Object.defineProperty(e, "id", { enumerable: !0, get: function get() {
        return e.i;
      } }), e.webpackPolyfill = 1), e;
  };
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t, n) {
    return t && i(e.prototype, t), n && i(e, n), e;
  }function s(e, t) {
    return (s = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function a(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = c(e);if (t) {
        var i = c(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return l(this, n);
    };
  }function l(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? u(e) : t;
  }function u(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
  }function c(e) {
    return (c = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var d = n(7).EventEmitter,
      h = n(1),
      f = n(0),
      p = n(33),
      g = n(20),
      _ = n(43),
      m = n(44),
      v = n(10),
      y = n(45),
      b = n(2),
      C = n(5),
      T = n(6),
      w = n(46),
      S = n(4),
      A = n(47),
      E = n(48),
      I = new h("UA"),
      R = { STATUS_INIT: 0, STATUS_READY: 1, STATUS_USER_CLOSED: 2, STATUS_NOT_READY: 3, CONFIGURATION_ERROR: 1, NETWORK_ERROR: 2 };function k(e) {
    this.emit("connecting", e);
  }function x(e) {
    this._status !== R.STATUS_USER_CLOSED && (this._status = R.STATUS_READY, this._error = null, this.emit("connected", e), this._dynConfiguration.register && this._registrator.register());
  }function M(e) {
    for (var t = 0, n = ["nict", "ict", "nist", "ist"]; t < n.length; t++) {
      var r = n[t];for (var i in this._transactions[r]) {
        Object.prototype.hasOwnProperty.call(this._transactions[r], i) && this._transactions[r][i].onTransportError();
      }
    }this.emit("disconnected", e), this._registrator.onTransportClosed(), this._status !== R.STATUS_USER_CLOSED && (this._status = R.STATUS_NOT_READY, this._error = R.NETWORK_ERROR);
  }function D(e) {
    var t = e.transport,
        n = e.message;if ((n = w.parseMessage(n, this)) && !(this._status === R.STATUS_USER_CLOSED && n instanceof S.IncomingRequest) && A(n, this, t)) if (n instanceof S.IncomingRequest) n.transport = t, this.receiveRequest(n);else if (n instanceof S.IncomingResponse) {
      var r;switch (n.method) {case f.INVITE:
          (r = this._transactions.ict[n.via_branch]) && r.receiveResponse(n);break;case f.ACK:
          break;default:
          (r = this._transactions.nict[n.via_branch]) && r.receiveResponse(n);}
    }
  }e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && s(e, t);
    }(n, e);var t = a(n);function n(e) {
      var r;if (function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, n), I.debug("new() [configuration:%o]", e), (r = t.call(this))._cache = { credentials: {} }, r._configuration = Object.assign({}, E.settings), r._dynConfiguration = {}, r._dialogs = {}, r._applicants = {}, r._sessions = {}, r._transport = null, r._contact = null, r._status = R.STATUS_INIT, r._error = null, r._transactions = { nist: {}, nict: {}, ist: {}, ict: {} }, r._data = {}, r._closeTimer = null, void 0 === e) throw new TypeError("Not enough arguments");try {
        r._loadConfig(e);
      } catch (e) {
        throw r._status = R.STATUS_NOT_READY, r._error = R.CONFIGURATION_ERROR, e;
      }return r._registrator = new p(u(r)), r;
    }return o(n, null, [{ key: "C", get: function get() {
        return R;
      } }]), o(n, [{ key: "start", value: function value() {
        I.debug("start()"), this._status === R.STATUS_INIT ? this._transport.connect() : this._status === R.STATUS_USER_CLOSED ? (I.debug("restarting UA"), null !== this._closeTimer && (clearTimeout(this._closeTimer), this._closeTimer = null, this._transport.disconnect()), this._status = R.STATUS_INIT, this._transport.connect()) : this._status === R.STATUS_READY ? I.debug("UA is in READY status, not restarted") : I.debug("ERROR: connection is down, Auto-Recovery system is trying to reconnect"), this._dynConfiguration.register = this._configuration.register;
      } }, { key: "register", value: function value() {
        I.debug("register()"), this._dynConfiguration.register = !0, this._registrator.register();
      } }, { key: "unregister", value: function value(e) {
        I.debug("unregister()"), this._dynConfiguration.register = !1, this._registrator.unregister(e);
      } }, { key: "registrator", value: function value() {
        return this._registrator;
      } }, { key: "isRegistered", value: function value() {
        return this._registrator.registered;
      } }, { key: "isConnected", value: function value() {
        return this._transport.isConnected();
      } }, { key: "call", value: function value(e, t) {
        I.debug("call()");var n = new g(this);return n.connect(e, t), n;
      } }, { key: "sendMessage", value: function value(e, t, n) {
        I.debug("sendMessage()");var r = new _(this);return r.send(e, t, n), r;
      } }, { key: "sendOptions", value: function value(e, t, n) {
        I.debug("sendOptions()");var r = new m(this);return r.send(e, t, n), r;
      } }, { key: "terminateSessions", value: function value(e) {
        for (var t in I.debug("terminateSessions()"), this._sessions) {
          this._sessions[t].isEnded() || this._sessions[t].terminate(e);
        }
      } }, { key: "stop", value: function value() {
        var e = this;if (I.debug("stop()"), this._dynConfiguration = {}, this._status !== R.STATUS_USER_CLOSED) {
          this._registrator.close();var t = Object.keys(this._sessions).length;for (var n in this._sessions) {
            if (Object.prototype.hasOwnProperty.call(this._sessions, n)) {
              I.debug("closing session ".concat(n));try {
                this._sessions[n].terminate();
              } catch (e) {}
            }
          }for (var r in this._applicants) {
            if (Object.prototype.hasOwnProperty.call(this._applicants, r)) try {
              this._applicants[r].close();
            } catch (e) {}
          }this._status = R.STATUS_USER_CLOSED, 0 === Object.keys(this._transactions.nict).length + Object.keys(this._transactions.nist).length + Object.keys(this._transactions.ict).length + Object.keys(this._transactions.ist).length && 0 === t ? this._transport.disconnect() : this._closeTimer = setTimeout(function () {
            e._closeTimer = null, e._transport.disconnect();
          }, 2e3);
        } else I.debug("UA already closed");
      } }, { key: "normalizeTarget", value: function value(e) {
        return b.normalizeTarget(e, this._configuration.hostport_params);
      } }, { key: "get", value: function value(e) {
        switch (e) {case "authorization_user":
            return this._configuration.authorization_user;case "realm":
            return this._configuration.realm;case "ha1":
            return this._configuration.ha1;case "authorization_jwt":
            return this._configuration.authorization_jwt;default:
            return void I.warn('get() | cannot get "%s" parameter in runtime', e);}
      } }, { key: "set", value: function value(e, t) {
        switch (e) {case "authorization_user":
            this._configuration.authorization_user = String(t);break;case "password":
            this._configuration.password = String(t);break;case "realm":
            this._configuration.realm = String(t);break;case "ha1":
            this._configuration.ha1 = String(t), this._configuration.password = null;break;case "authorization_jwt":
            this._configuration.authorization_jwt = String(t);break;case "display_name":
            this._configuration.display_name = t;break;default:
            return I.warn('set() | cannot set "%s" parameter in runtime', e), !1;}return !0;
      } }, { key: "newTransaction", value: function value(e) {
        this._transactions[e.type][e.id] = e, this.emit("newTransaction", { transaction: e });
      } }, { key: "destroyTransaction", value: function value(e) {
        delete this._transactions[e.type][e.id], this.emit("transactionDestroyed", { transaction: e });
      } }, { key: "newDialog", value: function value(e) {
        this._dialogs[e.id] = e;
      } }, { key: "destroyDialog", value: function value(e) {
        delete this._dialogs[e.id];
      } }, { key: "newMessage", value: function value(e, t) {
        this._applicants[e] = e, this.emit("newMessage", t);
      } }, { key: "newOptions", value: function value(e, t) {
        this._applicants[e] = e, this.emit("newOptions", t);
      } }, { key: "destroyMessage", value: function value(e) {
        delete this._applicants[e];
      } }, { key: "newRTCSession", value: function value(e, t) {
        this._sessions[e.id] = e, this.emit("newRTCSession", t);
      } }, { key: "destroyRTCSession", value: function value(e) {
        delete this._sessions[e.id];
      } }, { key: "registered", value: function value(e) {
        this.emit("registered", e);
      } }, { key: "unregistered", value: function value(e) {
        this.emit("unregistered", e);
      } }, { key: "registrationFailed", value: function value(e) {
        this.emit("registrationFailed", e);
      } }, { key: "receiveRequest", value: function value(e) {
        var t = e.method;if (e.ruri.user !== this._configuration.uri.user && e.ruri.user !== this._contact.uri.user) return I.debug("Request-URI does not point to us"), void (e.method !== f.ACK && e.reply_sl(404));if (e.ruri.scheme !== f.SIPS) {
          if (!v.checkTransaction(this, e)) {
            if (t === f.INVITE ? new v.InviteServerTransaction(this, this._transport, e) : t !== f.ACK && t !== f.CANCEL && new v.NonInviteServerTransaction(this, this._transport, e), t === f.OPTIONS) {
              if (0 === this.listeners("newOptions").length) return void e.reply(200);new m(this).init_incoming(e);
            } else if (t === f.MESSAGE) {
              if (0 === this.listeners("newMessage").length) return void e.reply(405);new _(this).init_incoming(e);
            } else if (t === f.INVITE && !e.to_tag && 0 === this.listeners("newRTCSession").length) return void e.reply(405);var n, r;if (e.to_tag) (n = this._findDialog(e.call_id, e.from_tag, e.to_tag)) ? n.receiveRequest(e) : t === f.NOTIFY ? (r = this._findSession(e)) ? r.receiveRequest(e) : (I.debug("received NOTIFY request for a non existent subscription"), e.reply(481, "Subscription does not exist")) : t !== f.ACK && e.reply(481);else switch (t) {case f.INVITE:
                if (window.RTCPeerConnection) {
                  if (e.hasHeader("replaces")) {
                    var i = e.replaces;(n = this._findDialog(i.call_id, i.from_tag, i.to_tag)) ? (r = n.owner).isEnded() ? e.reply(603) : r.receiveRequest(e) : e.reply(481);
                  } else (r = new g(this)).init_incoming(e);
                } else I.warn("INVITE received but WebRTC is not supported"), e.reply(488);break;case f.BYE:
                e.reply(481);break;case f.CANCEL:
                (r = this._findSession(e)) ? r.receiveRequest(e) : I.debug("received CANCEL request for a non existent session");break;case f.ACK:
                break;case f.NOTIFY:
                this.emit("sipEvent", { event: e.event, request: e }), e.reply(200);break;default:
                e.reply(405);}
          }
        } else e.reply_sl(416);
      } }, { key: "_findSession", value: function value(e) {
        var t = e.call_id,
            n = e.from_tag,
            r = e.to_tag,
            i = t + n,
            o = this._sessions[i],
            s = t + r,
            a = this._sessions[s];return o || a || null;
      } }, { key: "_findDialog", value: function value(e, t, n) {
        var r = e + t + n,
            i = this._dialogs[r];return i || (r = e + n + t, (i = this._dialogs[r]) || null);
      } }, { key: "_loadConfig", value: function value(e) {
        try {
          E.load(this._configuration, e);
        } catch (e) {
          throw e;
        }0 === this._configuration.display_name && (this._configuration.display_name = "0"), this._configuration.instance_id || (this._configuration.instance_id = b.newUUID()), this._configuration.jssip_id = b.createRandomToken(5);var t = this._configuration.uri.clone();t.user = null, this._configuration.hostport_params = t.toString().replace(/^sip:/i, "");try {
          this._transport = new y(this._configuration.sockets, { max_interval: this._configuration.connection_recovery_max_interval, min_interval: this._configuration.connection_recovery_min_interval }), this._transport.onconnecting = k.bind(this), this._transport.onconnect = x.bind(this), this._transport.ondisconnect = M.bind(this), this._transport.ondata = D.bind(this);
        } catch (e) {
          throw I.warn(e), new C.ConfigurationError("sockets", this._configuration.sockets);
        }if (delete this._configuration.sockets, this._configuration.authorization_user || (this._configuration.authorization_user = this._configuration.uri.user), !this._configuration.registrar_server) {
          var n = this._configuration.uri.clone();n.user = null, n.clearParams(), n.clearHeaders(), this._configuration.registrar_server = n;
        }this._configuration.no_answer_timeout *= 1e3, this._configuration.contact_uri ? this._configuration.via_host = this._configuration.contact_uri.host : this._configuration.contact_uri = new T("sip", b.createRandomToken(8), this._configuration.via_host, null, { transport: "ws" }), this._contact = { pub_gruu: null, temp_gruu: null, uri: this._configuration.contact_uri, toString: function toString() {
            var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
                t = e.anonymous || null,
                n = e.outbound || null,
                r = "<";return r += t ? this.temp_gruu || "sip:anonymous@anonymous.invalid;transport=ws" : this.pub_gruu || this.uri.toString(), !n || (t ? this.temp_gruu : this.pub_gruu) || (r += ";ob"), r + ">";
          } };var r = ["authorization_user", "password", "realm", "ha1", "authorization_jwt", "display_name", "register"];for (var i in this._configuration) {
          Object.prototype.hasOwnProperty.call(this._configuration, i) && (-1 !== r.indexOf(i) ? Object.defineProperty(this._configuration, i, { writable: !0, configurable: !1 }) : Object.defineProperty(this._configuration, i, { writable: !1, configurable: !1 }));
        }for (var o in I.debug("configuration parameters after validation:"), this._configuration) {
          if (Object.prototype.hasOwnProperty.call(E.settings, o)) switch (o) {case "uri":case "registrar_server":
              I.debug("- ".concat(o, ": ").concat(this._configuration[o]));break;case "password":case "ha1":case "authorization_jwt":
              I.debug("- ".concat(o, ": NOT SHOWN"));break;default:
              I.debug("- ".concat(o, ": ").concat(JSON.stringify(this._configuration[o])));}
        }
      } }, { key: "C", get: function get() {
        return R;
      } }, { key: "status", get: function get() {
        return this._status;
      } }, { key: "contact", get: function get() {
        return this._contact;
      } }, { key: "configuration", get: function get() {
        return this._configuration;
      } }, { key: "transport", get: function get() {
        return this._transport;
      } }]), n;
  }(d);
}, function (e, t, n) {
  e.exports = function (e) {
    function t(e) {
      var n = void 0,
          i = void 0,
          o = void 0,
          s = null;function a() {
        for (var _len = arguments.length, e = Array(_len), _key = 0; _key < _len; _key++) {
          e[_key] = arguments[_key];
        }

        if (!a.enabled) return;var r = a,
            i = Number(new Date()),
            o = i - (n || i);r.diff = o, r.prev = n, r.curr = i, n = i, e[0] = t.coerce(e[0]), "string" != typeof e[0] && e.unshift("%O");var s = 0;e[0] = e[0].replace(/%([a-zA-Z%])/g, function (n, i) {
          if ("%%" === n) return "%";s++;var o = t.formatters[i];if ("function" == typeof o) {
            var _t3 = e[s];n = o.call(r, _t3), e.splice(s, 1), s--;
          }return n;
        }), t.formatArgs.call(r, e), (r.log || t.log).apply(r, e);
      }return a.namespace = e, a.useColors = t.useColors(), a.color = t.selectColor(e), a.extend = r, a.destroy = t.destroy, Object.defineProperty(a, "enabled", { enumerable: !0, configurable: !1, get: function get() {
          return null !== s ? s : (i !== t.namespaces && (i = t.namespaces, o = t.enabled(e)), o);
        }, set: function set(e) {
          s = e;
        } }), "function" == typeof t.init && t.init(a), a;
    }function r(e, n) {
      var r = t(this.namespace + (void 0 === n ? ":" : n) + e);return r.log = this.log, r;
    }function i(e) {
      return e.toString().substring(2, e.toString().length - 2).replace(/\.\*\?$/, "*");
    }return t.debug = t, t.default = t, t.coerce = function (e) {
      return e instanceof Error ? e.stack || e.message : e;
    }, t.disable = function () {
      var e = [].concat((0, _toConsumableArray3.default)(t.names.map(i)), (0, _toConsumableArray3.default)(t.skips.map(i).map(function (e) {
        return "-" + e;
      }))).join(",");return t.enable(""), e;
    }, t.enable = function (e) {
      var n = void 0;t.save(e), t.namespaces = e, t.names = [], t.skips = [];var r = ("string" == typeof e ? e : "").split(/[\s,]+/),
          i = r.length;for (n = 0; n < i; n++) {
        r[n] && ("-" === (e = r[n].replace(/\*/g, ".*?"))[0] ? t.skips.push(new RegExp("^" + e.slice(1) + "$")) : t.names.push(new RegExp("^" + e + "$")));
      }
    }, t.enabled = function (e) {
      if ("*" === e[e.length - 1]) return !0;var n = void 0,
          r = void 0;for (n = 0, r = t.skips.length; n < r; n++) {
        if (t.skips[n].test(e)) return !1;
      }for (n = 0, r = t.names.length; n < r; n++) {
        if (t.names[n].test(e)) return !0;
      }return !1;
    }, t.humanize = n(32), t.destroy = function () {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }, Object.keys(e).forEach(function (n) {
      t[n] = e[n];
    }), t.names = [], t.skips = [], t.formatters = {}, t.selectColor = function (e) {
      var n = 0;for (var _t4 = 0; _t4 < e.length; _t4++) {
        n = (n << 5) - n + e.charCodeAt(_t4), n |= 0;
      }return t.colors[Math.abs(n) % t.colors.length];
    }, t.enable(t.load()), t;
  };
}, function (e, t) {
  var n = 1e3,
      r = 6e4,
      i = 60 * r,
      o = 24 * i;function s(e, t, n, r) {
    var i = t >= 1.5 * n;return Math.round(e / n) + " " + r + (i ? "s" : "");
  }e.exports = function (e, t) {
    t = t || {};var a = typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);if ("string" === a && e.length > 0) return function (e) {
      if (!((e = String(e)).length > 100)) {
        var t = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);if (t) {
          var s = parseFloat(t[1]);switch ((t[2] || "ms").toLowerCase()) {case "years":case "year":case "yrs":case "yr":case "y":
              return 315576e5 * s;case "weeks":case "week":case "w":
              return 6048e5 * s;case "days":case "day":case "d":
              return s * o;case "hours":case "hour":case "hrs":case "hr":case "h":
              return s * i;case "minutes":case "minute":case "mins":case "min":case "m":
              return s * r;case "seconds":case "second":case "secs":case "sec":case "s":
              return s * n;case "milliseconds":case "millisecond":case "msecs":case "msec":case "ms":
              return s;default:
              return;}
        }
      }
    }(e);if ("number" === a && isFinite(e)) return t.long ? function (e) {
      var t = Math.abs(e);return t >= o ? s(e, t, o, "day") : t >= i ? s(e, t, i, "hour") : t >= r ? s(e, t, r, "minute") : t >= n ? s(e, t, n, "second") : e + " ms";
    }(e) : function (e) {
      var t = Math.abs(e);return t >= o ? Math.round(e / o) + "d" : t >= i ? Math.round(e / i) + "h" : t >= r ? Math.round(e / r) + "m" : t >= n ? Math.round(e / n) + "s" : e + "ms";
    }(e);throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e));
  };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(1),
      o = n(2),
      s = n(0),
      a = n(4),
      l = n(9),
      u = new i("Registrator");e.exports = function () {
    function e(t, n) {
      !function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), this._reg_id = 1, this._ua = t, this._transport = n, this._registrar = t.configuration.registrar_server, this._expires = t.configuration.register_expires, this._call_id = o.createRandomToken(22), this._cseq = 0, this._to_uri = t.configuration.uri, this._registrationTimer = null, this._registering = !1, this._registered = !1, this._contact = this._ua.contact.toString(), this._contact += ";+sip.ice", this._extraHeaders = [], this._extraContactParams = "", this._sipInstance = '"<urn:uuid:'.concat(this._ua.configuration.instance_id, '>"'), this._contact += ";reg-id=".concat(this._reg_id), this._contact += ";+sip.instance=".concat(this._sipInstance);
    }var t, n, i;return t = e, (n = [{ key: "setExtraHeaders", value: function value(e) {
        Array.isArray(e) || (e = []), this._extraHeaders = e.slice();
      } }, { key: "setExtraContactParams", value: function value(e) {
        for (var t in e instanceof Object || (e = {}), this._extraContactParams = "", e) {
          if (Object.prototype.hasOwnProperty.call(e, t)) {
            var n = e[t];this._extraContactParams += ";".concat(t), n && (this._extraContactParams += "=".concat(n));
          }
        }
      } }, { key: "register", value: function value() {
        var e = this;if (this._registering) u.debug("Register request in progress...");else {
          var t = this._extraHeaders.slice();t.push("Contact: ".concat(this._contact, ";expires=").concat(this._expires).concat(this._extraContactParams)), t.push("Expires: ".concat(this._expires));var n = new a.OutgoingRequest(s.REGISTER, this._registrar, this._ua, { to_uri: this._to_uri, call_id: this._call_id, cseq: this._cseq += 1 }, t),
              r = new l(this._ua, n, { onRequestTimeout: function onRequestTimeout() {
              e._registrationFailure(null, s.causes.REQUEST_TIMEOUT);
            }, onTransportError: function onTransportError() {
              e._registrationFailure(null, s.causes.CONNECTION_ERROR);
            }, onAuthenticated: function onAuthenticated() {
              e._cseq += 1;
            }, onReceiveResponse: function onReceiveResponse(t) {
              if (t.cseq === e._cseq) switch (null !== e._registrationTimer && (clearTimeout(e._registrationTimer), e._registrationTimer = null), !0) {case /^1[0-9]{2}$/.test(t.status_code):
                  break;case /^2[0-9]{2}$/.test(t.status_code):
                  if (e._registering = !1, !t.hasHeader("Contact")) {
                    u.debug("no Contact header in response to REGISTER, response ignored");break;
                  }var n = t.headers.Contact.reduce(function (e, t) {
                    return e.concat(t.parsed);
                  }, []),
                      r = n.find(function (t) {
                    return e._sipInstance === t.getParam("+sip.instance") && e._reg_id === parseInt(t.getParam("reg-id"));
                  });if (r || (r = n.find(function (t) {
                    return t.uri.user === e._ua.contact.uri.user;
                  })), !r) {
                    u.debug("no Contact header pointing to us, response ignored");break;
                  }var i = r.getParam("expires");!i && t.hasHeader("expires") && (i = t.getHeader("expires")), i || (i = e._expires), (i = Number(i)) < 10 && (i = 10);var a = i > 64 ? 1e3 * i / 2 + Math.floor(1e3 * (i / 2 - 32) * Math.random()) : 1e3 * i - 5e3;e._registrationTimer = setTimeout(function () {
                    e._registrationTimer = null, 0 === e._ua.listeners("registrationExpiring").length ? e.register() : e._ua.emit("registrationExpiring");
                  }, a), r.hasParam("temp-gruu") && (e._ua.contact.temp_gruu = r.getParam("temp-gruu").replace(/"/g, "")), r.hasParam("pub-gruu") && (e._ua.contact.pub_gruu = r.getParam("pub-gruu").replace(/"/g, "")), e._registered || (e._registered = !0, e._ua.registered({ response: t }));break;case /^423$/.test(t.status_code):
                  t.hasHeader("min-expires") ? (e._expires = Number(t.getHeader("min-expires")), e._expires < 10 && (e._expires = 10), e.register()) : (u.debug("423 response received for REGISTER without Min-Expires"), e._registrationFailure(t, s.causes.SIP_FAILURE_CODE));break;default:
                  var l = o.sipErrorCause(t.status_code);e._registrationFailure(t, l);}
            } });this._registering = !0, r.send();
        }
      } }, { key: "unregister", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};if (this._registered) {
          this._registered = !1, null !== this._registrationTimer && (clearTimeout(this._registrationTimer), this._registrationTimer = null);var n = this._extraHeaders.slice();t.all ? n.push("Contact: *".concat(this._extraContactParams)) : n.push("Contact: ".concat(this._contact, ";expires=0").concat(this._extraContactParams)), n.push("Expires: 0");var r = new a.OutgoingRequest(s.REGISTER, this._registrar, this._ua, { to_uri: this._to_uri, call_id: this._call_id, cseq: this._cseq += 1 }, n),
              i = new l(this._ua, r, { onRequestTimeout: function onRequestTimeout() {
              e._unregistered(null, s.causes.REQUEST_TIMEOUT);
            }, onTransportError: function onTransportError() {
              e._unregistered(null, s.causes.CONNECTION_ERROR);
            }, onAuthenticated: function onAuthenticated() {
              e._cseq += 1;
            }, onReceiveResponse: function onReceiveResponse(t) {
              switch (!0) {case /^1[0-9]{2}$/.test(t.status_code):
                  break;case /^2[0-9]{2}$/.test(t.status_code):
                  e._unregistered(t);break;default:
                  var n = o.sipErrorCause(t.status_code);e._unregistered(t, n);}
            } });i.send();
        } else u.debug("already unregistered");
      } }, { key: "close", value: function value() {
        this._registered && this.unregister();
      } }, { key: "onTransportClosed", value: function value() {
        this._registering = !1, null !== this._registrationTimer && (clearTimeout(this._registrationTimer), this._registrationTimer = null), this._registered && (this._registered = !1, this._ua.unregistered({}));
      } }, { key: "_registrationFailure", value: function value(e, t) {
        this._registering = !1, this._ua.registrationFailed({ response: e || null, cause: t }), this._registered && (this._registered = !1, this._ua.unregistered({ response: e || null, cause: t }));
      } }, { key: "_unregistered", value: function value(e, t) {
        this._registering = !1, this._registered = !1, this._ua.unregistered({ response: e || null, cause: t || null });
      } }, { key: "registered", get: function get() {
        return this._registered;
      } }]) && r(t.prototype, n), i && r(t, i), e;
  }();
}, function (e, t, n) {
  var r = function r(e) {
    return String(Number(e)) === e ? Number(e) : e;
  },
      i = function i(e, t, n) {
    var i = e.name && e.names;e.push && !t[e.push] ? t[e.push] = [] : i && !t[e.name] && (t[e.name] = {});var o = e.push ? {} : i ? t[e.name] : t;!function (e, t, n, i) {
      if (i && !n) t[i] = r(e[1]);else for (var o = 0; o < n.length; o += 1) {
        null != e[o + 1] && (t[n[o]] = r(e[o + 1]));
      }
    }(n.match(e.reg), o, e.names, e.name), e.push && t[e.push].push(o);
  },
      o = n(18),
      s = RegExp.prototype.test.bind(/^([a-z])=(.*)/);t.parse = function (e) {
    var t = {},
        n = [],
        r = t;return e.split(/(\r\n|\r|\n)/).filter(s).forEach(function (e) {
      var t = e[0],
          s = e.slice(2);"m" === t && (n.push({ rtp: [], fmtp: [] }), r = n[n.length - 1]);for (var a = 0; a < (o[t] || []).length; a += 1) {
        var l = o[t][a];if (l.reg.test(s)) return i(l, r, s);
      }
    }), t.media = n, t;
  };var a = function a(e, t) {
    var n = t.split(/=(.+)/, 2);return 2 === n.length ? e[n[0]] = r(n[1]) : 1 === n.length && t.length > 1 && (e[n[0]] = void 0), e;
  };t.parseParams = function (e) {
    return e.split(/;\s?/).reduce(a, {});
  }, t.parseFmtpConfig = t.parseParams, t.parsePayloads = function (e) {
    return e.toString().split(" ").map(Number);
  }, t.parseRemoteCandidates = function (e) {
    for (var t = [], n = e.split(" ").map(r), i = 0; i < n.length; i += 3) {
      t.push({ component: n[i], ip: n[i + 1], port: n[i + 2] });
    }return t;
  }, t.parseImageAttributes = function (e) {
    return e.split(" ").map(function (e) {
      return e.substring(1, e.length - 1).split(",").reduce(a, {});
    });
  }, t.parseSimulcastStreamList = function (e) {
    return e.split(";").map(function (e) {
      return e.split(",").map(function (e) {
        var t,
            n = !1;return "~" !== e[0] ? t = r(e) : (t = r(e.substring(1, e.length)), n = !0), { scid: t, paused: n };
      });
    });
  };
}, function (e, t, n) {
  var r = n(18),
      i = /%[sdv%]/g,
      o = function o(e) {
    var t = 1,
        n = arguments,
        r = n.length;return e.replace(i, function (e) {
      if (t >= r) return e;var i = n[t];switch (t += 1, e) {case "%%":
          return "%";case "%s":
          return String(i);case "%d":
          return Number(i);case "%v":
          return "";}
    });
  },
      s = function s(e, t, n) {
    var r = [e + "=" + (t.format instanceof Function ? t.format(t.push ? n : n[t.name]) : t.format)];if (t.names) for (var i = 0; i < t.names.length; i += 1) {
      var s = t.names[i];t.name ? r.push(n[t.name][s]) : r.push(n[t.names[i]]);
    } else r.push(n[t.name]);return o.apply(null, r);
  },
      a = ["v", "o", "s", "i", "u", "e", "p", "c", "b", "t", "r", "z", "a"],
      l = ["i", "c", "b", "a"];e.exports = function (e, t) {
    t = t || {}, null == e.version && (e.version = 0), null == e.name && (e.name = " "), e.media.forEach(function (e) {
      null == e.payloads && (e.payloads = "");
    });var n = t.outerOrder || a,
        i = t.innerOrder || l,
        o = [];return n.forEach(function (t) {
      r[t].forEach(function (n) {
        n.name in e && null != e[n.name] ? o.push(s(t, n, e)) : n.push in e && null != e[n.push] && e[n.push].forEach(function (e) {
          o.push(s(t, n, e));
        });
      });
    }), e.media.forEach(function (e) {
      o.push(s("m", r.m[0], e)), i.forEach(function (t) {
        r[t].forEach(function (n) {
          n.name in e && null != e[n.name] ? o.push(s(t, n, e)) : n.push in e && null != e[n.push] && e[n.push].forEach(function (e) {
            o.push(s(t, n, e));
          });
        });
      });
    }), o.join("\r\n") + "\r\n";
  };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(1),
      o = n(2),
      s = new i("DigestAuthentication");e.exports = function () {
    function e(t) {
      !function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), this._credentials = t, this._cnonce = null, this._nc = 0, this._ncHex = "00000000", this._algorithm = null, this._realm = null, this._nonce = null, this._opaque = null, this._stale = null, this._qop = null, this._method = null, this._uri = null, this._ha1 = null, this._response = null;
    }var t, n, i;return t = e, (n = [{ key: "get", value: function value(e) {
        switch (e) {case "realm":
            return this._realm;case "ha1":
            return this._ha1;default:
            return void s.warn('get() | cannot get "%s" parameter', e);}
      } }, { key: "authenticate", value: function value(e, t) {
        var n = e.method,
            r = e.ruri,
            i = e.body,
            a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null;if (this._algorithm = t.algorithm, this._realm = t.realm, this._nonce = t.nonce, this._opaque = t.opaque, this._stale = t.stale, this._algorithm) {
          if ("MD5" !== this._algorithm) return s.warn('authenticate() | challenge with Digest algorithm different than "MD5", authentication aborted'), !1;
        } else this._algorithm = "MD5";if (!this._nonce) return s.warn("authenticate() | challenge without Digest nonce, authentication aborted"), !1;if (!this._realm) return s.warn("authenticate() | challenge without Digest realm, authentication aborted"), !1;if (!this._credentials.password) {
          if (!this._credentials.ha1) return s.warn("authenticate() | no plain SIP password nor ha1 provided, authentication aborted"), !1;if (this._credentials.realm !== this._realm) return s.warn('authenticate() | no plain SIP password, and stored `realm` does not match the given `realm`, cannot authenticate [stored:"%s", given:"%s"]', this._credentials.realm, this._realm), !1;
        }if (t.qop) {
          if (t.qop.indexOf("auth-int") > -1) this._qop = "auth-int";else {
            if (!(t.qop.indexOf("auth") > -1)) return s.warn('authenticate() | challenge without Digest qop different than "auth" or "auth-int", authentication aborted'), !1;this._qop = "auth";
          }
        } else this._qop = null;this._method = n, this._uri = r, this._cnonce = a || o.createRandomToken(12), this._nc += 1;var l,
            u,
            c = Number(this._nc).toString(16);return this._ncHex = "00000000".substr(0, 8 - c.length) + c, 4294967296 === this._nc && (this._nc = 1, this._ncHex = "00000001"), this._credentials.password ? this._ha1 = o.calculateMD5("".concat(this._credentials.username, ":").concat(this._realm, ":").concat(this._credentials.password)) : this._ha1 = this._credentials.ha1, "auth" === this._qop ? (l = "".concat(this._method, ":").concat(this._uri), u = o.calculateMD5(l), s.debug('authenticate() | using qop=auth [a2:"%s"]', l), this._response = o.calculateMD5("".concat(this._ha1, ":").concat(this._nonce, ":").concat(this._ncHex, ":").concat(this._cnonce, ":auth:").concat(u))) : "auth-int" === this._qop ? (l = "".concat(this._method, ":").concat(this._uri, ":").concat(o.calculateMD5(i || "")), u = o.calculateMD5(l), s.debug('authenticate() | using qop=auth-int [a2:"%s"]', l), this._response = o.calculateMD5("".concat(this._ha1, ":").concat(this._nonce, ":").concat(this._ncHex, ":").concat(this._cnonce, ":auth-int:").concat(u))) : null === this._qop && (l = "".concat(this._method, ":").concat(this._uri), u = o.calculateMD5(l), s.debug('authenticate() | using qop=null [a2:"%s"]', l), this._response = o.calculateMD5("".concat(this._ha1, ":").concat(this._nonce, ":").concat(u))), s.debug("authenticate() | response generated"), !0;
      } }, { key: "toString", value: function value() {
        var e = [];if (!this._response) throw new Error("response field does not exist, cannot generate Authorization header");return e.push("algorithm=".concat(this._algorithm)), e.push('username="'.concat(this._credentials.username, '"')), e.push('realm="'.concat(this._realm, '"')), e.push('nonce="'.concat(this._nonce, '"')), e.push('uri="'.concat(this._uri, '"')), e.push('response="'.concat(this._response, '"')), this._opaque && e.push('opaque="'.concat(this._opaque, '"')), this._qop && (e.push("qop=".concat(this._qop)), e.push('cnonce="'.concat(this._cnonce, '"')), e.push("nc=".concat(this._ncHex))), "Digest ".concat(e.join(", "));
      } }]) && r(t.prototype, n), i && r(t, i), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t, n) {
    return t && i(e.prototype, t), n && i(e, n), e;
  }var s = n(1),
      a = n(4),
      l = n(0),
      u = n(10),
      c = n(38),
      d = n(2),
      h = new s("Dialog"),
      f = { STATUS_EARLY: 1, STATUS_CONFIRMED: 2 };e.exports = function () {
    function e(t, n, i) {
      var o = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : f.STATUS_CONFIRMED;if (r(this, e), this._owner = t, this._ua = t._ua, this._uac_pending_reply = !1, this._uas_pending_reply = !1, !n.hasHeader("contact")) return { error: "unable to create a Dialog without Contact header field" };n instanceof a.IncomingResponse && (o = n.status_code < 200 ? f.STATUS_EARLY : f.STATUS_CONFIRMED);var s = n.parseHeader("contact");"UAS" === i ? (this._id = { call_id: n.call_id, local_tag: n.to_tag, remote_tag: n.from_tag, toString: function toString() {
          return this.call_id + this.local_tag + this.remote_tag;
        } }, this._state = o, this._remote_seqnum = n.cseq, this._local_uri = n.parseHeader("to").uri, this._remote_uri = n.parseHeader("from").uri, this._remote_target = s.uri, this._route_set = n.getHeaders("record-route"), this._ack_seqnum = this._remote_seqnum) : "UAC" === i && (this._id = { call_id: n.call_id, local_tag: n.from_tag, remote_tag: n.to_tag, toString: function toString() {
          return this.call_id + this.local_tag + this.remote_tag;
        } }, this._state = o, this._local_seqnum = n.cseq, this._local_uri = n.parseHeader("from").uri, this._remote_uri = n.parseHeader("to").uri, this._remote_target = s.uri, this._route_set = n.getHeaders("record-route").reverse(), this._ack_seqnum = null), this._ua.newDialog(this), h.debug("new ".concat(i, " dialog created with status ").concat(this._state === f.STATUS_EARLY ? "EARLY" : "CONFIRMED"));
    }return o(e, null, [{ key: "C", get: function get() {
        return f;
      } }]), o(e, [{ key: "update", value: function value(e, t) {
        this._state = f.STATUS_CONFIRMED, h.debug("dialog ".concat(this._id.toString(), "  changed to CONFIRMED state")), "UAC" === t && (this._route_set = e.getHeaders("record-route").reverse());
      } }, { key: "terminate", value: function value() {
        h.debug("dialog ".concat(this._id.toString(), " deleted")), this._ua.destroyDialog(this);
      } }, { key: "sendRequest", value: function value(e) {
        var t = this,
            n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
            r = d.cloneArray(n.extraHeaders),
            i = d.cloneObject(n.eventHandlers),
            o = n.body || null,
            s = this._createRequest(e, r, o);i.onAuthenticated = function () {
          t._local_seqnum += 1;
        };var a = new c(this, s, i);return a.send(), s;
      } }, { key: "receiveRequest", value: function value(e) {
        this._checkInDialogRequest(e) && (e.method === l.ACK && null !== this._ack_seqnum ? this._ack_seqnum = null : e.method === l.INVITE && (this._ack_seqnum = e.cseq), this._owner.receiveRequest(e));
      } }, { key: "_createRequest", value: function value(e, t, n) {
        t = d.cloneArray(t), this._local_seqnum || (this._local_seqnum = Math.floor(1e4 * Math.random()));var r = e === l.CANCEL || e === l.ACK ? this._local_seqnum : this._local_seqnum += 1;return new a.OutgoingRequest(e, this._remote_target, this._ua, { cseq: r, call_id: this._id.call_id, from_uri: this._local_uri, from_tag: this._id.local_tag, to_uri: this._remote_uri, to_tag: this._id.remote_tag, route_set: this._route_set }, t, n);
      } }, { key: "_checkInDialogRequest", value: function value(e) {
        var t = this;if (this._remote_seqnum) {
          if (e.cseq < this._remote_seqnum) {
            if (e.method !== l.ACK) return e.reply(500), !1;if (null === this._ack_seqnum || e.cseq !== this._ack_seqnum) return !1;
          } else e.cseq > this._remote_seqnum && (this._remote_seqnum = e.cseq);
        } else this._remote_seqnum = e.cseq;if (e.method === l.INVITE || e.method === l.UPDATE && e.body) {
          if (!0 === this._uac_pending_reply) e.reply(491);else {
            if (!0 === this._uas_pending_reply) {
              var n = 1 + (10 * Math.random() | 0);return e.reply(500, null, ["Retry-After:".concat(n)]), !1;
            }this._uas_pending_reply = !0, e.server_transaction.on("stateChanged", function n() {
              e.server_transaction.state !== u.C.STATUS_ACCEPTED && e.server_transaction.state !== u.C.STATUS_COMPLETED && e.server_transaction.state !== u.C.STATUS_TERMINATED || (e.server_transaction.removeListener("stateChanged", n), t._uas_pending_reply = !1);
            });
          }e.hasHeader("contact") && e.server_transaction.on("stateChanged", function () {
            e.server_transaction.state === u.C.STATUS_ACCEPTED && (t._remote_target = e.parseHeader("contact").uri);
          });
        } else e.method === l.NOTIFY && e.hasHeader("contact") && e.server_transaction.on("stateChanged", function () {
          e.server_transaction.state === u.C.STATUS_COMPLETED && (t._remote_target = e.parseHeader("contact").uri);
        });return !0;
      } }, { key: "id", get: function get() {
        return this._id;
      } }, { key: "local_seqnum", get: function get() {
        return this._local_seqnum;
      }, set: function set(e) {
        this._local_seqnum = e;
      } }, { key: "owner", get: function get() {
        return this._owner;
      } }, { key: "uac_pending_reply", get: function get() {
        return this._uac_pending_reply;
      }, set: function set(e) {
        this._uac_pending_reply = e;
      } }, { key: "uas_pending_reply", get: function get() {
        return this._uas_pending_reply;
      } }]), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(0),
      o = n(10),
      s = n(20),
      a = n(9),
      l = { onRequestTimeout: function onRequestTimeout() {}, onTransportError: function onTransportError() {}, onSuccessResponse: function onSuccessResponse() {}, onErrorResponse: function onErrorResponse() {}, onAuthenticated: function onAuthenticated() {}, onDialogError: function onDialogError() {} };e.exports = function () {
    function e(t, n, r) {
      for (var i in function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), this._dialog = t, this._ua = t._ua, this._request = n, this._eventHandlers = r, this._reattempt = !1, this._reattemptTimer = null, l) {
        Object.prototype.hasOwnProperty.call(l, i) && (this._eventHandlers[i] || (this._eventHandlers[i] = l[i]));
      }
    }var t, n, u;return t = e, (n = [{ key: "send", value: function value() {
        var e = this,
            t = new a(this._ua, this._request, { onRequestTimeout: function onRequestTimeout() {
            e._eventHandlers.onRequestTimeout();
          }, onTransportError: function onTransportError() {
            e._eventHandlers.onTransportError();
          }, onAuthenticated: function onAuthenticated(t) {
            e._eventHandlers.onAuthenticated(t);
          }, onReceiveResponse: function onReceiveResponse(t) {
            e._receiveResponse(t);
          } });t.send(), (this._request.method === i.INVITE || this._request.method === i.UPDATE && this._request.body) && t.clientTransaction.state !== o.C.STATUS_TERMINATED && (this._dialog.uac_pending_reply = !0, t.clientTransaction.on("stateChanged", function n() {
          t.clientTransaction.state !== o.C.STATUS_ACCEPTED && t.clientTransaction.state !== o.C.STATUS_COMPLETED && t.clientTransaction.state !== o.C.STATUS_TERMINATED || (t.clientTransaction.removeListener("stateChanged", n), e._dialog.uac_pending_reply = !1);
        }));
      } }, { key: "_receiveResponse", value: function value(e) {
        var t = this;408 === e.status_code || 481 === e.status_code ? this._eventHandlers.onDialogError(e) : e.method === i.INVITE && 491 === e.status_code ? this._reattempt ? e.status_code >= 200 && e.status_code < 300 ? this._eventHandlers.onSuccessResponse(e) : e.status_code >= 300 && this._eventHandlers.onErrorResponse(e) : (this._request.cseq = this._dialog.local_seqnum += 1, this._reattemptTimer = setTimeout(function () {
          t._dialog.owner.status !== s.C.STATUS_TERMINATED && (t._reattempt = !0, t._request_sender.send());
        }, 1e3)) : e.status_code >= 200 && e.status_code < 300 ? this._eventHandlers.onSuccessResponse(e) : e.status_code >= 300 && this._eventHandlers.onErrorResponse(e);
      } }, { key: "request", get: function get() {
        return this._request;
      } }]) && r(t.prototype, n), u && r(t, u), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t) {
    return (o = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function s(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = l(e);if (t) {
        var i = l(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    return (l = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var u = n(7).EventEmitter,
      c = n(1),
      d = n(0),
      h = n(5),
      f = n(2),
      p = new c("RTCSession:DTMF"),
      g = { MIN_DURATION: 70, MAX_DURATION: 6e3, DEFAULT_DURATION: 100, MIN_INTER_TONE_GAP: 50, DEFAULT_INTER_TONE_GAP: 500 };e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && o(e, t);
    }(l, e);var t,
        n,
        r,
        a = s(l);function l(e) {
      var t;return function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, l), (t = a.call(this))._session = e, t._direction = null, t._tone = null, t._duration = null, t._request = null, t;
    }return t = l, (n = [{ key: "send", value: function value(e) {
        var t = this,
            n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};if (void 0 === e) throw new TypeError("Not enough arguments");if (this._direction = "outgoing", this._session.status !== this._session.C.STATUS_CONFIRMED && this._session.status !== this._session.C.STATUS_WAITING_FOR_ACK) throw new h.InvalidStateError(this._session.status);var r = f.cloneArray(n.extraHeaders);if (this.eventHandlers = f.cloneObject(n.eventHandlers), "string" == typeof e) e = e.toUpperCase();else {
          if ("number" != typeof e) throw new TypeError("Invalid tone: ".concat(e));e = e.toString();
        }if (!e.match(/^[0-9A-DR#*]$/)) throw new TypeError("Invalid tone: ".concat(e));this._tone = e, this._duration = n.duration, r.push("Content-Type: application/dtmf-relay");var i = "Signal=".concat(this._tone, "\r\n");i += "Duration=".concat(this._duration), this._session.newDTMF({ originator: "local", dtmf: this, request: this._request }), this._session.sendRequest(d.INFO, { extraHeaders: r, eventHandlers: { onSuccessResponse: function onSuccessResponse(e) {
              t.emit("succeeded", { originator: "remote", response: e });
            }, onErrorResponse: function onErrorResponse(e) {
              t.eventHandlers.onFailed && t.eventHandlers.onFailed(), t.emit("failed", { originator: "remote", response: e });
            }, onRequestTimeout: function onRequestTimeout() {
              t._session.onRequestTimeout();
            }, onTransportError: function onTransportError() {
              t._session.onTransportError();
            }, onDialogError: function onDialogError() {
              t._session.onDialogError();
            } }, body: i });
      } }, { key: "init_incoming", value: function value(e) {
        var t = /^(Signal\s*?=\s*?)([0-9A-D#*]{1})(\s)?.*/,
            n = /^(Duration\s?=\s?)([0-9]{1,4})(\s)?.*/;if (this._direction = "incoming", this._request = e, e.reply(200), e.body) {
          var r = e.body.split("\n");r.length >= 1 && t.test(r[0]) && (this._tone = r[0].replace(t, "$2")), r.length >= 2 && n.test(r[1]) && (this._duration = parseInt(r[1].replace(n, "$2"), 10));
        }this._duration || (this._duration = g.DEFAULT_DURATION), this._tone ? this._session.newDTMF({ originator: "remote", dtmf: this, request: e }) : p.debug("invalid INFO DTMF received, discarded");
      } }, { key: "tone", get: function get() {
        return this._tone;
      } }, { key: "duration", get: function get() {
        return this._duration;
      } }]) && i(t.prototype, n), r && i(t, r), l;
  }(u), e.exports.C = g;
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t) {
    return (o = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function s(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = l(e);if (t) {
        var i = l(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    return (l = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var u = n(7).EventEmitter,
      c = n(0),
      d = n(5),
      h = n(2);e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && o(e, t);
    }(l, e);var t,
        n,
        r,
        a = s(l);function l(e) {
      var t;return function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, l), (t = a.call(this))._session = e, t._direction = null, t._contentType = null, t._body = null, t;
    }return t = l, (n = [{ key: "send", value: function value(e, t) {
        var n = this,
            r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};if (this._direction = "outgoing", void 0 === e) throw new TypeError("Not enough arguments");if (this._session.status !== this._session.C.STATUS_CONFIRMED && this._session.status !== this._session.C.STATUS_WAITING_FOR_ACK) throw new d.InvalidStateError(this._session.status);this._contentType = e, this._body = t;var i = h.cloneArray(r.extraHeaders);i.push("Content-Type: ".concat(e)), this._session.newInfo({ originator: "local", info: this, request: this.request }), this._session.sendRequest(c.INFO, { extraHeaders: i, eventHandlers: { onSuccessResponse: function onSuccessResponse(e) {
              n.emit("succeeded", { originator: "remote", response: e });
            }, onErrorResponse: function onErrorResponse(e) {
              n.emit("failed", { originator: "remote", response: e });
            }, onTransportError: function onTransportError() {
              n._session.onTransportError();
            }, onRequestTimeout: function onRequestTimeout() {
              n._session.onRequestTimeout();
            }, onDialogError: function onDialogError() {
              n._session.onDialogError();
            } }, body: t });
      } }, { key: "init_incoming", value: function value(e) {
        this._direction = "incoming", this.request = e, e.reply(200), this._contentType = e.hasHeader("Content-Type") ? e.getHeader("Content-Type").toLowerCase() : void 0, this._body = e.body, this._session.newInfo({ originator: "remote", info: this, request: e });
      } }, { key: "contentType", get: function get() {
        return this._contentType;
      } }, { key: "body", get: function get() {
        return this._body;
      } }]) && i(t.prototype, n), r && i(t, r), l;
  }(u);
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(1),
      o = n(0),
      s = new i("RTCSession:ReferNotifier"),
      a = "refer",
      l = "message/sipfrag;version=2.0",
      u = 300;e.exports = function () {
    function e(t, n, r) {
      !function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), this._session = t, this._id = n, this._expires = r || u, this._active = !0, this.notify(100);
    }var t, n, i;return t = e, (n = [{ key: "notify", value: function value(e, t) {
        var n;s.debug("notify()"), !1 !== this._active && (t = t || o.REASON_PHRASE[e] || "", n = e >= 200 ? "terminated;reason=noresource" : "active;expires=".concat(this._expires), this._session.sendRequest(o.NOTIFY, { extraHeaders: ["Event: ".concat(a, ";id=").concat(this._id), "Subscription-State: ".concat(n), "Content-Type: ".concat(l)], body: "SIP/2.0 ".concat(e, " ").concat(t), eventHandlers: { onErrorResponse: function onErrorResponse() {
              this._active = !1;
            } } }));
      } }]) && r(t.prototype, n), i && r(t, i), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t) {
    return (o = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function s(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = l(e);if (t) {
        var i = l(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    return (l = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var u = n(7).EventEmitter,
      c = n(1),
      d = n(0),
      h = n(3),
      f = n(2),
      p = new c("RTCSession:ReferSubscriber");e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && o(e, t);
    }(l, e);var t,
        n,
        r,
        a = s(l);function l(e) {
      var t;return function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, l), (t = a.call(this))._id = null, t._session = e, t;
    }return t = l, (n = [{ key: "sendRefer", value: function value(e) {
        var t = this,
            n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};p.debug("sendRefer()");var r = f.cloneArray(n.extraHeaders),
            i = f.cloneObject(n.eventHandlers);for (var o in i) {
          Object.prototype.hasOwnProperty.call(i, o) && this.on(o, i[o]);
        }var s = null;n.replaces && (s = n.replaces._request.call_id, s += ";to-tag=".concat(n.replaces._to_tag), s += ";from-tag=".concat(n.replaces._from_tag), s = encodeURIComponent(s));var a = "Refer-To: <".concat(e).concat(s ? "?Replaces=".concat(s) : "", ">");if (r.push(a), !r.some(function (e) {
          return e.toLowerCase().startsWith("referred-by:");
        })) {
          var l = "Referred-By: <".concat(this._session._ua._configuration.uri._scheme, ":").concat(this._session._ua._configuration.uri._user, "@").concat(this._session._ua._configuration.uri._host, ">");r.push(l);
        }r.push("Contact: ".concat(this._session.contact));var u = this._session.sendRequest(d.REFER, { extraHeaders: r, eventHandlers: { onSuccessResponse: function onSuccessResponse(e) {
              t._requestSucceeded(e);
            }, onErrorResponse: function onErrorResponse(e) {
              t._requestFailed(e, d.causes.REJECTED);
            }, onTransportError: function onTransportError() {
              t._requestFailed(null, d.causes.CONNECTION_ERROR);
            }, onRequestTimeout: function onRequestTimeout() {
              t._requestFailed(null, d.causes.REQUEST_TIMEOUT);
            }, onDialogError: function onDialogError() {
              t._requestFailed(null, d.causes.DIALOG_ERROR);
            } } });this._id = u.cseq;
      } }, { key: "receiveNotify", value: function value(e) {
        if (p.debug("receiveNotify()"), e.body) {
          var t = h.parse(e.body.trim(), "Status_Line");if (-1 !== t) switch (!0) {case /^100$/.test(t.status_code):
              this.emit("trying", { request: e, status_line: t });break;case /^1[0-9]{2}$/.test(t.status_code):
              this.emit("progress", { request: e, status_line: t });break;case /^2[0-9]{2}$/.test(t.status_code):
              this.emit("accepted", { request: e, status_line: t });break;default:
              this.emit("failed", { request: e, status_line: t });} else p.debug('receiveNotify() | error parsing NOTIFY body: "'.concat(e.body, '"'));
        }
      } }, { key: "_requestSucceeded", value: function value(e) {
        p.debug("REFER succeeded"), p.debug('emit "requestSucceeded"'), this.emit("requestSucceeded", { response: e });
      } }, { key: "_requestFailed", value: function value(e, t) {
        p.debug("REFER failed"), p.debug('emit "requestFailed"'), this.emit("requestFailed", { response: e || null, cause: t });
      } }, { key: "id", get: function get() {
        return this._id;
      } }]) && i(t.prototype, n), r && i(t, r), l;
  }(u);
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t) {
    return (o = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function s(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = l(e);if (t) {
        var i = l(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    return (l = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var u = n(7).EventEmitter,
      c = n(1),
      d = n(0),
      h = n(4),
      f = n(2),
      p = n(9),
      g = n(5),
      _ = n(6),
      m = new c("Message");e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && o(e, t);
    }(l, e);var t,
        n,
        r,
        a = s(l);function l(e) {
      var t;return function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, l), (t = a.call(this))._ua = e, t._request = null, t._closed = !1, t._direction = null, t._local_identity = null, t._remote_identity = null, t._is_replied = !1, t._data = {}, t;
    }return t = l, (n = [{ key: "send", value: function value(e, t) {
        var n = this,
            r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
            i = e;if (void 0 === e || void 0 === t) throw new TypeError("Not enough arguments");if (!(e = this._ua.normalizeTarget(e))) throw new TypeError("Invalid target: ".concat(i));var o = f.cloneArray(r.extraHeaders),
            s = f.cloneObject(r.eventHandlers),
            a = r.contentType || "text/plain",
            l = {};for (var u in r.fromUserName && (l.from_uri = new _("sip", r.fromUserName, this._ua.configuration.uri.host), o.push("P-Preferred-Identity: ".concat(this._ua.configuration.uri.toString()))), r.fromDisplayName && (l.from_display_name = r.fromDisplayName), s) {
          Object.prototype.hasOwnProperty.call(s, u) && this.on(u, s[u]);
        }o.push("Content-Type: ".concat(a)), this._request = new h.OutgoingRequest(d.MESSAGE, e, this._ua, l, o), t && (this._request.body = t);var c = new p(this._ua, this._request, { onRequestTimeout: function onRequestTimeout() {
            n._onRequestTimeout();
          }, onTransportError: function onTransportError() {
            n._onTransportError();
          }, onReceiveResponse: function onReceiveResponse(e) {
            n._receiveResponse(e);
          } });this._newMessage("local", this._request), c.send();
      } }, { key: "init_incoming", value: function value(e) {
        this._request = e, this._newMessage("remote", e), this._is_replied || (this._is_replied = !0, e.reply(200)), this._close();
      } }, { key: "accept", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            t = f.cloneArray(e.extraHeaders),
            n = e.body;if ("incoming" !== this._direction) throw new g.NotSupportedError('"accept" not supported for outgoing Message');if (this._is_replied) throw new Error("incoming Message already replied");this._is_replied = !0, this._request.reply(200, null, t, n);
      } }, { key: "reject", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            t = e.status_code || 480,
            n = e.reason_phrase,
            r = f.cloneArray(e.extraHeaders),
            i = e.body;if ("incoming" !== this._direction) throw new g.NotSupportedError('"reject" not supported for outgoing Message');if (this._is_replied) throw new Error("incoming Message already replied");if (t < 300 || t >= 700) throw new TypeError("Invalid status_code: ".concat(t));this._is_replied = !0, this._request.reply(t, n, r, i);
      } }, { key: "_receiveResponse", value: function value(e) {
        if (!this._closed) switch (!0) {case /^1[0-9]{2}$/.test(e.status_code):
            break;case /^2[0-9]{2}$/.test(e.status_code):
            this._succeeded("remote", e);break;default:
            var t = f.sipErrorCause(e.status_code);this._failed("remote", e, t);}
      } }, { key: "_onRequestTimeout", value: function value() {
        this._closed || this._failed("system", null, d.causes.REQUEST_TIMEOUT);
      } }, { key: "_onTransportError", value: function value() {
        this._closed || this._failed("system", null, d.causes.CONNECTION_ERROR);
      } }, { key: "_close", value: function value() {
        this._closed = !0, this._ua.destroyMessage(this);
      } }, { key: "_newMessage", value: function value(e, t) {
        "remote" === e ? (this._direction = "incoming", this._local_identity = t.to, this._remote_identity = t.from) : "local" === e && (this._direction = "outgoing", this._local_identity = t.from, this._remote_identity = t.to), this._ua.newMessage(this, { originator: e, message: this, request: t });
      } }, { key: "_failed", value: function value(e, t, n) {
        m.debug("MESSAGE failed"), this._close(), m.debug('emit "failed"'), this.emit("failed", { originator: e, response: t || null, cause: n });
      } }, { key: "_succeeded", value: function value(e, t) {
        m.debug("MESSAGE succeeded"), this._close(), m.debug('emit "succeeded"'), this.emit("succeeded", { originator: e, response: t });
      } }, { key: "direction", get: function get() {
        return this._direction;
      } }, { key: "local_identity", get: function get() {
        return this._local_identity;
      } }, { key: "remote_identity", get: function get() {
        return this._remote_identity;
      } }]) && i(t.prototype, n), r && i(t, r), l;
  }(u);
}, function (e, t, n) {
  "use strict";
  function r(e) {
    return (r = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function o(e, t) {
    return (o = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function s(e) {
    var t = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;if (Reflect.construct.sham) return !1;if ("function" == typeof Proxy) return !0;try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();return function () {
      var n,
          r = l(e);if (t) {
        var i = l(this).constructor;n = Reflect.construct(r, arguments, i);
      } else n = r.apply(this, arguments);return a(this, n);
    };
  }function a(e, t) {
    return !t || "object" !== r(t) && "function" != typeof t ? function (e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
    }(e) : t;
  }function l(e) {
    return (l = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }var u = n(7).EventEmitter,
      c = n(1),
      d = n(0),
      h = n(4),
      f = n(2),
      p = n(9),
      g = n(5),
      _ = new c("Options");e.exports = function (e) {
    !function (e, t) {
      if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), t && o(e, t);
    }(l, e);var t,
        n,
        r,
        a = s(l);function l(e) {
      var t;return function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, l), (t = a.call(this))._ua = e, t._request = null, t._closed = !1, t._direction = null, t._local_identity = null, t._remote_identity = null, t._is_replied = !1, t._data = {}, t;
    }return t = l, (n = [{ key: "send", value: function value(e, t) {
        var n = this,
            r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
            i = e;if (void 0 === e) throw new TypeError("A target is required for OPTIONS");if (!(e = this._ua.normalizeTarget(e))) throw new TypeError("Invalid target: ".concat(i));var o = f.cloneArray(r.extraHeaders),
            s = f.cloneObject(r.eventHandlers),
            a = r.contentType || "application/sdp";for (var l in s) {
          Object.prototype.hasOwnProperty.call(s, l) && this.on(l, s[l]);
        }o.push("Content-Type: ".concat(a)), this._request = new h.OutgoingRequest(d.OPTIONS, e, this._ua, null, o), t && (this._request.body = t);var u = new p(this._ua, this._request, { onRequestTimeout: function onRequestTimeout() {
            n._onRequestTimeout();
          }, onTransportError: function onTransportError() {
            n._onTransportError();
          }, onReceiveResponse: function onReceiveResponse(e) {
            n._receiveResponse(e);
          } });this._newOptions("local", this._request), u.send();
      } }, { key: "init_incoming", value: function value(e) {
        this._request = e, this._newOptions("remote", e), this._is_replied || (this._is_replied = !0, e.reply(200)), this._close();
      } }, { key: "accept", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            t = f.cloneArray(e.extraHeaders),
            n = e.body;if ("incoming" !== this._direction) throw new g.NotSupportedError('"accept" not supported for outgoing Options');if (this._is_replied) throw new Error("incoming Options already replied");this._is_replied = !0, this._request.reply(200, null, t, n);
      } }, { key: "reject", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            t = e.status_code || 480,
            n = e.reason_phrase,
            r = f.cloneArray(e.extraHeaders),
            i = e.body;if ("incoming" !== this._direction) throw new g.NotSupportedError('"reject" not supported for outgoing Options');if (this._is_replied) throw new Error("incoming Options already replied");if (t < 300 || t >= 700) throw new TypeError("Invalid status_code: ".concat(t));this._is_replied = !0, this._request.reply(t, n, r, i);
      } }, { key: "_receiveResponse", value: function value(e) {
        if (!this._closed) switch (!0) {case /^1[0-9]{2}$/.test(e.status_code):
            break;case /^2[0-9]{2}$/.test(e.status_code):
            this._succeeded("remote", e);break;default:
            var t = f.sipErrorCause(e.status_code);this._failed("remote", e, t);}
      } }, { key: "_onRequestTimeout", value: function value() {
        this._closed || this._failed("system", null, d.causes.REQUEST_TIMEOUT);
      } }, { key: "_onTransportError", value: function value() {
        this._closed || this._failed("system", null, d.causes.CONNECTION_ERROR);
      } }, { key: "_close", value: function value() {
        this._closed = !0, this._ua.destroyMessage(this);
      } }, { key: "_newOptions", value: function value(e, t) {
        "remote" === e ? (this._direction = "incoming", this._local_identity = t.to, this._remote_identity = t.from) : "local" === e && (this._direction = "outgoing", this._local_identity = t.from, this._remote_identity = t.to), this._ua.newOptions(this, { originator: e, message: this, request: t });
      } }, { key: "_failed", value: function value(e, t, n) {
        _.debug("OPTIONS failed"), this._close(), _.debug('emit "failed"'), this.emit("failed", { originator: e, response: t || null, cause: n });
      } }, { key: "_succeeded", value: function value(e, t) {
        _.debug("OPTIONS succeeded"), this._close(), _.debug('emit "succeeded"'), this.emit("succeeded", { originator: e, response: t });
      } }, { key: "direction", get: function get() {
        return this._direction;
      } }, { key: "local_identity", get: function get() {
        return this._local_identity;
      } }, { key: "remote_identity", get: function get() {
        return this._remote_identity;
      } }]) && i(t.prototype, n), r && i(t, r), l;
  }(u);
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function i(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var o = n(1),
      s = n(21),
      a = n(0),
      l = new o("Transport"),
      u = { STATUS_CONNECTED: 0, STATUS_CONNECTING: 1, STATUS_DISCONNECTED: 2, SOCKET_STATUS_READY: 0, SOCKET_STATUS_ERROR: 1, recovery_options: { min_interval: a.CONNECTION_RECOVERY_MIN_INTERVAL, max_interval: a.CONNECTION_RECOVERY_MAX_INTERVAL } };e.exports = function () {
    function e(t) {
      var n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : u.recovery_options;r(this, e), l.debug("new()"), this.status = u.STATUS_DISCONNECTED, this.socket = null, this.sockets = [], this.recovery_options = n, this.recover_attempts = 0, this.recovery_timer = null, this.close_requested = !1;try {
        this.textDecoder = new TextDecoder("utf8");
      } catch (e) {
        l.warn("cannot use TextDecoder: ".concat(e));
      }if (void 0 === t) throw new TypeError("Invalid argument. undefined 'sockets' argument");t instanceof Array || (t = [t]), t.forEach(function (e) {
        if (!s.isSocket(e.socket)) throw new TypeError("Invalid argument. invalid 'JsSIP.Socket' instance");if (e.weight && !Number(e.weight)) throw new TypeError("Invalid argument. 'weight' attribute is not a number");this.sockets.push({ socket: e.socket, weight: e.weight || 0, status: u.SOCKET_STATUS_READY });
      }, this), this._getSocket();
    }var t, n, o;return t = e, (n = [{ key: "connect", value: function value() {
        l.debug("connect()"), this.isConnected() ? l.debug("Transport is already connected") : this.isConnecting() ? l.debug("Transport is connecting") : (this.close_requested = !1, this.status = u.STATUS_CONNECTING, this.onconnecting({ socket: this.socket, attempts: this.recover_attempts }), this.close_requested || (this.socket.onconnect = this._onConnect.bind(this), this.socket.ondisconnect = this._onDisconnect.bind(this), this.socket.ondata = this._onData.bind(this), this.socket.connect()));
      } }, { key: "disconnect", value: function value() {
        l.debug("close()"), this.close_requested = !0, this.recover_attempts = 0, this.status = u.STATUS_DISCONNECTED, null !== this.recovery_timer && (clearTimeout(this.recovery_timer), this.recovery_timer = null), this.socket.onconnect = function () {}, this.socket.ondisconnect = function () {}, this.socket.ondata = function () {}, this.socket.disconnect(), this.ondisconnect({ socket: this.socket, error: !1 });
      } }, { key: "send", value: function value(e) {
        if (l.debug("send()"), !this.isConnected()) return l.warn("unable to send message, transport is not connected"), !1;var t = e.toString();return l.debug("sending message:\n\n".concat(t, "\n")), this.socket.send(t);
      } }, { key: "isConnected", value: function value() {
        return this.status === u.STATUS_CONNECTED;
      } }, { key: "isConnecting", value: function value() {
        return this.status === u.STATUS_CONNECTING;
      } }, { key: "_reconnect", value: function value() {
        var e = this;this.recover_attempts += 1;var t = Math.floor(Math.random() * Math.pow(2, this.recover_attempts) + 1);t < this.recovery_options.min_interval ? t = this.recovery_options.min_interval : t > this.recovery_options.max_interval && (t = this.recovery_options.max_interval), l.debug("reconnection attempt: ".concat(this.recover_attempts, ". next connection attempt in ").concat(t, " seconds")), this.recovery_timer = setTimeout(function () {
          e.close_requested || e.isConnected() || e.isConnecting() || (e._getSocket(), e.connect());
        }, 1e3 * t);
      } }, { key: "_getSocket", value: function value() {
        var e = [];if (this.sockets.forEach(function (t) {
          t.status !== u.SOCKET_STATUS_ERROR && (0 === e.length ? e.push(t) : t.weight > e[0].weight ? e = [t] : t.weight === e[0].weight && e.push(t));
        }), 0 === e.length) return this.sockets.forEach(function (e) {
          e.status = u.SOCKET_STATUS_READY;
        }), void this._getSocket();var t = Math.floor(Math.random() * e.length);this.socket = e[t].socket;
      } }, { key: "_onConnect", value: function value() {
        this.recover_attempts = 0, this.status = u.STATUS_CONNECTED, null !== this.recovery_timer && (clearTimeout(this.recovery_timer), this.recovery_timer = null), this.onconnect({ socket: this });
      } }, { key: "_onDisconnect", value: function value(e, t, n) {
        this.status = u.STATUS_DISCONNECTED, this.ondisconnect({ socket: this.socket, error: e, code: t, reason: n }), this.close_requested || (this.sockets.forEach(function (e) {
          this.socket === e.socket && (e.status = u.SOCKET_STATUS_ERROR);
        }, this), this._reconnect(e));
      } }, { key: "_onData", value: function value(e) {
        if ("\r\n" !== e) {
          if ("string" != typeof e) {
            try {
              e = this.textDecoder ? this.textDecoder.decode(e) : String.fromCharCode.apply(null, new Uint8Array(e));
            } catch (e) {
              return void l.debug("received binary message failed to be converted into string, message discarded");
            }l.debug("received binary message:\n\n".concat(e, "\n"));
          } else l.debug("received text message:\n\n".concat(e, "\n"));this.ondata({ transport: this, message: e });
        } else l.debug("received message with CRLF Keep Alive response");
      } }, { key: "via_transport", get: function get() {
        return this.socket.via_transport;
      } }, { key: "url", get: function get() {
        return this.socket.url;
      } }, { key: "sip_uri", get: function get() {
        return this.socket.sip_uri;
      } }]) && i(t.prototype, n), o && i(t, o), e;
  }();
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    var _n8;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n8 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return i(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? i(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n8 && (e = _n8);var r = 0,
            o = function o() {};return { s: o, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e13) {
            throw _e13;
          }, f: o };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var s,
        a = !0,
        l = !1;return { s: function s() {
        _n8 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n8.next();return a = e.done, e;
      }, e: function e(_e14) {
        l = !0, s = _e14;
      }, f: function f() {
        try {
          a || null == _n8.return || _n8.return();
        } finally {
          if (l) throw s;
        }
      } };
  }function i(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }var o = n(1),
      s = n(3),
      a = n(4),
      l = new o("Parser");function u(e, t) {
    var n = t,
        r = 0,
        i = 0;if (e.substring(n, n + 2).match(/(^\r\n)/)) return -2;for (; 0 === r;) {
      if (-1 === (i = e.indexOf("\r\n", n))) return i;!e.substring(i + 2, i + 4).match(/(^\r\n)/) && e.charAt(i + 2).match(/(^\s+)/) ? n = i + 2 : r = i;
    }return r;
  }function c(e, t, n, i) {
    var o,
        l = t.indexOf(":", n),
        u = t.substring(n, l).trim(),
        c = t.substring(l + 1, i).trim();switch (u.toLowerCase()) {case "via":case "v":
        e.addHeader("via", c), 1 === e.getHeaders("via").length ? (o = e.parseHeader("Via")) && (e.via = o, e.via_branch = o.branch) : o = 0;break;case "from":case "f":
        e.setHeader("from", c), (o = e.parseHeader("from")) && (e.from = o, e.from_tag = o.getParam("tag"));break;case "to":case "t":
        e.setHeader("to", c), (o = e.parseHeader("to")) && (e.to = o, e.to_tag = o.getParam("tag"));break;case "record-route":
        if (-1 === (o = s.parse(c, "Record_Route"))) o = void 0;else {
          var d,
              h = r(o);try {
            for (h.s(); !(d = h.n()).done;) {
              var f = d.value;e.addHeader("record-route", c.substring(f.possition, f.offset)), e.headers["Record-Route"][e.getHeaders("record-route").length - 1].parsed = f.parsed;
            }
          } catch (e) {
            h.e(e);
          } finally {
            h.f();
          }
        }break;case "call-id":case "i":
        e.setHeader("call-id", c), (o = e.parseHeader("call-id")) && (e.call_id = c);break;case "contact":case "m":
        if (-1 === (o = s.parse(c, "Contact"))) o = void 0;else {
          var p,
              g = r(o);try {
            for (g.s(); !(p = g.n()).done;) {
              var _ = p.value;e.addHeader("contact", c.substring(_.possition, _.offset)), e.headers.Contact[e.getHeaders("contact").length - 1].parsed = _.parsed;
            }
          } catch (e) {
            g.e(e);
          } finally {
            g.f();
          }
        }break;case "content-length":case "l":
        e.setHeader("content-length", c), o = e.parseHeader("content-length");break;case "content-type":case "c":
        e.setHeader("content-type", c), o = e.parseHeader("content-type");break;case "cseq":
        e.setHeader("cseq", c), (o = e.parseHeader("cseq")) && (e.cseq = o.value), e instanceof a.IncomingResponse && (e.method = o.method);break;case "max-forwards":
        e.setHeader("max-forwards", c), o = e.parseHeader("max-forwards");break;case "www-authenticate":
        e.setHeader("www-authenticate", c), o = e.parseHeader("www-authenticate");break;case "proxy-authenticate":
        e.setHeader("proxy-authenticate", c), o = e.parseHeader("proxy-authenticate");break;case "session-expires":case "x":
        e.setHeader("session-expires", c), (o = e.parseHeader("session-expires")) && (e.session_expires = o.expires, e.session_expires_refresher = o.refresher);break;case "refer-to":case "r":
        e.setHeader("refer-to", c), (o = e.parseHeader("refer-to")) && (e.refer_to = o);break;case "replaces":
        e.setHeader("replaces", c), (o = e.parseHeader("replaces")) && (e.replaces = o);break;case "event":case "o":
        e.setHeader("event", c), (o = e.parseHeader("event")) && (e.event = o);break;default:
        e.addHeader(u, c), o = 0;}return void 0 !== o || { error: 'error parsing header "'.concat(u, '"') };
  }t.parseMessage = function (e, t) {
    var n,
        r,
        i = e.indexOf("\r\n");if (-1 !== i) {
      var o = e.substring(0, i),
          d = s.parse(o, "Request_Response");if (-1 !== d) {
        d.status_code ? ((n = new a.IncomingResponse()).status_code = d.status_code, n.reason_phrase = d.reason_phrase) : ((n = new a.IncomingRequest(t)).method = d.method, n.ruri = d.uri), n.data = e;for (var h = i + 2;;) {
          if (-2 === (i = u(e, h))) {
            r = h + 2;break;
          }if (-1 === i) return void l.warn("parseMessage() | malformed message");if (!0 !== (d = c(n, e, h, i))) return void l.warn("parseMessage() |", d.error);h = i + 2;
        }if (n.hasHeader("content-length")) {
          var f = n.getHeader("content-length");n.body = e.substr(r, f);
        } else n.body = e.substring(r);return n;
      }l.warn('parseMessage() | error parsing first line of SIP message: "'.concat(o, '"'));
    } else l.warn("parseMessage() | no CRLF found, not a SIP message");
  };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    var _n9;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n9 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return i(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? i(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n9 && (e = _n9);var r = 0,
            o = function o() {};return { s: o, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e15) {
            throw _e15;
          }, f: o };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var s,
        a = !0,
        l = !1;return { s: function s() {
        _n9 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n9.next();return a = e.done, e;
      }, e: function e(_e16) {
        l = !0, s = _e16;
      }, f: function f() {
        try {
          a || null == _n9.return || _n9.return();
        } finally {
          if (l) throw s;
        }
      } };
  }function i(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }var o,
      s,
      a,
      l = n(1),
      u = n(0),
      c = n(4),
      d = n(2),
      h = new l("sanityCheck"),
      f = [function () {
    for (var e = 0, t = ["from", "to", "call_id", "cseq", "via"]; e < t.length; e++) {
      var n = t[e];if (!o.hasHeader(n)) return h.debug("missing mandatory header field : ".concat(n, ", dropping the response")), !1;
    }
  }],
      p = [function () {
    if ("sip" !== o.s("to").uri.scheme) return _(416), !1;
  }, function () {
    if (!o.to_tag && o.call_id.substr(0, 5) === s.configuration.jssip_id) return _(482), !1;
  }, function () {
    var e = d.str_utf8_length(o.body),
        t = o.getHeader("content-length");if (e < t) return _(400), !1;
  }, function () {
    var e,
        t = o.from_tag,
        n = o.call_id,
        r = o.cseq;if (!o.to_tag) if (o.method === u.INVITE) {
      if (s._transactions.ist[o.via_branch]) return !1;for (var i in s._transactions.ist) {
        if (Object.prototype.hasOwnProperty.call(s._transactions.ist, i) && (e = s._transactions.ist[i]).request.from_tag === t && e.request.call_id === n && e.request.cseq === r) return _(482), !1;
      }
    } else {
      if (s._transactions.nist[o.via_branch]) return !1;for (var a in s._transactions.nist) {
        if (Object.prototype.hasOwnProperty.call(s._transactions.nist, a) && (e = s._transactions.nist[a]).request.from_tag === t && e.request.call_id === n && e.request.cseq === r) return _(482), !1;
      }
    }
  }],
      g = [function () {
    if (o.getHeaders("via").length > 1) return h.debug("more than one Via header field present in the response, dropping the response"), !1;
  }, function () {
    var e = d.str_utf8_length(o.body),
        t = o.getHeader("content-length");if (e < t) return h.debug("message body length is lower than the value in Content-Length header field, dropping the response"), !1;
  }];function _(e) {
    var t,
        n,
        i = o.getHeaders("via"),
        s = "SIP/2.0 ".concat(e, " ").concat(u.REASON_PHRASE[e], "\r\n"),
        l = r(i);try {
      for (l.s(); !(n = l.n()).done;) {
        var c = n.value;s += "Via: ".concat(c, "\r\n");
      }
    } catch (e) {
      l.e(e);
    } finally {
      l.f();
    }t = o.getHeader("To"), o.to_tag || (t += ";tag=".concat(d.newTag())), s += "To: ".concat(t, "\r\n"), s += "From: ".concat(o.getHeader("From"), "\r\n"), s += "Call-ID: ".concat(o.call_id, "\r\n"), s += "CSeq: ".concat(o.cseq, " ").concat(o.method, "\r\n"), s += "\r\n", a.send(s);
  }e.exports = function (e, t, n) {
    o = e, s = t, a = n;var i,
        l = r(f);try {
      for (l.s(); !(i = l.n()).done;) {
        if (!1 === (0, i.value)()) return !1;
      }
    } catch (e) {
      l.e(e);
    } finally {
      l.f();
    }if (o instanceof c.IncomingRequest) {
      var u,
          d = r(p);try {
        for (d.s(); !(u = d.n()).done;) {
          if (!1 === (0, u.value)()) return !1;
        }
      } catch (e) {
        d.e(e);
      } finally {
        d.f();
      }
    } else if (o instanceof c.IncomingResponse) {
      var h,
          _ = r(g);try {
        for (_.s(); !(h = _.n()).done;) {
          if (!1 === (0, h.value)()) return !1;
        }
      } catch (e) {
        _.e(e);
      } finally {
        _.f();
      }
    }return !0;
  };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    var _n10;if ("undefined" == typeof Symbol || null == e[Symbol.iterator]) {
      if (Array.isArray(e) || (_n10 = function (e, t) {
        if (e) {
          if ("string" == typeof e) return i(e, t);var n = Object.prototype.toString.call(e).slice(8, -1);return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? i(e, t) : void 0;
        }
      }(e)) || t && e && "number" == typeof e.length) {
        _n10 && (e = _n10);var r = 0,
            o = function o() {};return { s: o, n: function n() {
            return r >= e.length ? { done: !0 } : { done: !1, value: e[r++] };
          }, e: function e(_e17) {
            throw _e17;
          }, f: o };
      }throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }var s,
        a = !0,
        l = !1;return { s: function s() {
        _n10 = e[Symbol.iterator]();
      }, n: function n() {
        var e = _n10.next();return a = e.done, e;
      }, e: function e(_e18) {
        l = !0, s = _e18;
      }, f: function f() {
        try {
          a || null == _n10.return || _n10.return();
        } finally {
          if (l) throw s;
        }
      } };
  }function i(e, t) {
    (null == t || t > e.length) && (t = e.length);for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }return r;
  }var o = n(2),
      s = n(0),
      a = n(3),
      l = n(6),
      u = n(21),
      c = n(5);t.settings = { authorization_user: null, password: null, realm: null, ha1: null, authorization_jwt: null, display_name: null, uri: null, contact_uri: null, instance_id: null, use_preloaded_route: !1, session_timers: !0, session_timers_refresh_method: s.UPDATE, session_timers_force_refresher: !1, no_answer_timeout: 60, register: !0, register_expires: 600, registrar_server: null, sockets: null, connection_recovery_max_interval: s.CONNECTION_RECOVERY_MAX_INTERVAL, connection_recovery_min_interval: s.CONNECTION_RECOVERY_MIN_INTERVAL, via_host: "".concat(o.createRandomToken(12), ".invalid") };var d = { mandatory: { sockets: function sockets(e) {
        var t = [];if (u.isSocket(e)) t.push({ socket: e });else {
          if (!Array.isArray(e) || !e.length) return;var n,
              i = r(e);try {
            for (i.s(); !(n = i.n()).done;) {
              var o = n.value;Object.prototype.hasOwnProperty.call(o, "socket") && u.isSocket(o.socket) ? t.push(o) : u.isSocket(o) && t.push({ socket: o });
            }
          } catch (e) {
            i.e(e);
          } finally {
            i.f();
          }
        }return t;
      }, uri: function uri(e) {
        /^sip:/i.test(e) || (e = "".concat(s.SIP, ":").concat(e));var t = l.parse(e);return t && t.user ? t : void 0;
      } }, optional: { authorization_user: function authorization_user(e) {
        return -1 === a.parse('"'.concat(e, '"'), "quoted_string") ? void 0 : e;
      }, authorization_jwt: function authorization_jwt(e) {
        if ("string" == typeof e) return e;
      }, user_agent: function user_agent(e) {
        if ("string" == typeof e) return e;
      }, connection_recovery_max_interval: function connection_recovery_max_interval(e) {
        if (o.isDecimal(e)) {
          var t = Number(e);if (t > 0) return t;
        }
      }, connection_recovery_min_interval: function connection_recovery_min_interval(e) {
        if (o.isDecimal(e)) {
          var t = Number(e);if (t > 0) return t;
        }
      }, contact_uri: function contact_uri(e) {
        if ("string" == typeof e) {
          var t = a.parse(e, "SIP_URI");if (-1 !== t) return t;
        }
      }, display_name: function display_name(e) {
        return e;
      }, instance_id: function instance_id(e) {
        return (/^uuid:/i.test(e) && (e = e.substr(5)), -1 === a.parse(e, "uuid") ? void 0 : e
        );
      }, no_answer_timeout: function no_answer_timeout(e) {
        if (o.isDecimal(e)) {
          var t = Number(e);if (t > 0) return t;
        }
      }, session_timers: function session_timers(e) {
        if ("boolean" == typeof e) return e;
      }, session_timers_refresh_method: function session_timers_refresh_method(e) {
        if ("string" == typeof e && ((e = e.toUpperCase()) === s.INVITE || e === s.UPDATE)) return e;
      }, session_timers_force_refresher: function session_timers_force_refresher(e) {
        if ("boolean" == typeof e) return e;
      }, password: function password(e) {
        return String(e);
      }, realm: function realm(e) {
        return String(e);
      }, ha1: function ha1(e) {
        return String(e);
      }, register: function register(e) {
        if ("boolean" == typeof e) return e;
      }, register_expires: function register_expires(e) {
        if (o.isDecimal(e)) {
          var t = Number(e);if (t > 0) return t;
        }
      }, registrar_server: function registrar_server(e) {
        /^sip:/i.test(e) || (e = "".concat(s.SIP, ":").concat(e));var t = l.parse(e);return t ? t.user ? void 0 : t : void 0;
      }, use_preloaded_route: function use_preloaded_route(e) {
        if ("boolean" == typeof e) return e;
      } } };t.load = function (e, t) {
    for (var n in d.mandatory) {
      if (!t.hasOwnProperty(n)) throw new c.ConfigurationError(n);var r = t[n],
          i = d.mandatory[n](r);if (void 0 === i) throw new c.ConfigurationError(n, r);e[n] = i;
    }for (var s in d.optional) {
      if (t.hasOwnProperty(s)) {
        var a = t[s];if (o.isEmpty(a)) continue;var l = d.optional[s](a);if (void 0 === l) throw new c.ConfigurationError(s, a);e[s] = l;
      }
    }
  };
}, function (e, t, n) {
  "use strict";
  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }var i = n(1),
      o = n(3),
      s = new i("WebSocketInterface");e.exports = function () {
    function e(t) {
      !function (e, t) {
        if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
      }(this, e), s.debug('new() [url:"%s"]', t), this._url = t, this._sip_uri = null, this._via_transport = null, this._ws = null;var n = o.parse(t, "absoluteURI");if (-1 === n) throw s.warn("invalid WebSocket URI: ".concat(t)), new TypeError("Invalid argument: ".concat(t));if ("wss" !== n.scheme && "ws" !== n.scheme) throw s.warn("invalid WebSocket URI scheme: ".concat(n.scheme)), new TypeError("Invalid argument: ".concat(t));this._sip_uri = "sip:".concat(n.host).concat(n.port ? ":".concat(n.port) : "", ";transport=ws"), this._via_transport = n.scheme.toUpperCase();
    }var t, n, i;return t = e, (n = [{ key: "connect", value: function value() {
        if (s.debug("connect()"), this.isConnected()) s.debug("WebSocket ".concat(this._url, " is already connected"));else if (this.isConnecting()) s.debug("WebSocket ".concat(this._url, " is connecting"));else {
          this._ws && this.disconnect(), s.debug("connecting to WebSocket ".concat(this._url));try {
            this._ws = new WebSocket(this._url, "sip"), this._ws.binaryType = "arraybuffer", this._ws.onopen = this._onOpen.bind(this), this._ws.onclose = this._onClose.bind(this), this._ws.onmessage = this._onMessage.bind(this), this._ws.onerror = this._onError.bind(this);
          } catch (e) {
            this._onError(e);
          }
        }
      } }, { key: "disconnect", value: function value() {
        s.debug("disconnect()"), this._ws && (this._ws.onopen = function () {}, this._ws.onclose = function () {}, this._ws.onmessage = function () {}, this._ws.onerror = function () {}, this._ws.close(), this._ws = null);
      } }, { key: "send", value: function value(e) {
        return s.debug("send()"), this.isConnected() ? (this._ws.send(e), !0) : (s.warn("unable to send message, WebSocket is not open"), !1);
      } }, { key: "isConnected", value: function value() {
        return this._ws && this._ws.readyState === this._ws.OPEN;
      } }, { key: "isConnecting", value: function value() {
        return this._ws && this._ws.readyState === this._ws.CONNECTING;
      } }, { key: "_onOpen", value: function value() {
        s.debug("WebSocket ".concat(this._url, " connected")), this.onconnect();
      } }, { key: "_onClose", value: function value(e) {
        var t = e.wasClean,
            n = e.code,
            r = e.reason;s.debug("WebSocket ".concat(this._url, " closed")), !1 === t && s.debug("WebSocket abrupt disconnection"), this.ondisconnect(!t, n, r);
      } }, { key: "_onMessage", value: function value(e) {
        var t = e.data;s.debug("received WebSocket message"), this.ondata(t);
      } }, { key: "_onError", value: function value(e) {
        s.warn("WebSocket ".concat(this._url, " error: "), e);
      } }, { key: "via_transport", get: function get() {
        return this._via_transport;
      }, set: function set(e) {
        this._via_transport = e.toUpperCase();
      } }, { key: "sip_uri", get: function get() {
        return this._sip_uri;
      } }, { key: "url", get: function get() {
        return this._url;
      } }]) && r(t.prototype, n), i && r(t, i), e;
  }();
}, function (e, t, n) {
  "use strict";
  e.exports = function (e) {
    if ("number" != typeof e) throw new TypeError("Expected a number");var t = e > 0 ? Math.floor : Math.ceil;return { days: t(e / 864e5), hours: t(e / 36e5) % 24, minutes: t(e / 6e4) % 60, seconds: t(e / 1e3) % 60, milliseconds: t(e) % 1e3, microseconds: t(1e3 * e) % 1e3, nanoseconds: t(1e6 * e) % 1e3 };
  };
}, function (e, t, n) {
  "use strict";
  Object.defineProperty(t, "__esModule", { value: !0 });var r = function () {
    function e() {
      this._queue = [], this._pending = !1;
    }return e.prototype.isLocked = function () {
      return this._pending;
    }, e.prototype.acquire = function () {
      var e = this,
          t = new Promise(function (t) {
        return e._queue.push(t);
      });return this._pending || this._dispatchNext(), t;
    }, e.prototype.runExclusive = function (e) {
      return this.acquire().then(function (t) {
        var n;try {
          n = e();
        } catch (e) {
          throw t(), e;
        }return Promise.resolve(n).then(function (e) {
          return t(), e;
        }, function (e) {
          throw t(), e;
        });
      });
    }, e.prototype._dispatchNext = function () {
      this._queue.length > 0 ? (this._pending = !0, this._queue.shift()(this._dispatchNext.bind(this))) : this._pending = !1;
    }, e;
  }();t.default = r;
}, function (e, t, n) {
  "use strict";
  n.r(t);var r = {};n.r(r), n.d(r, "shimGetUserMedia", function () {
    return Ae;
  }), n.d(r, "shimGetDisplayMedia", function () {
    return Ee;
  }), n.d(r, "shimMediaStream", function () {
    return Ie;
  }), n.d(r, "shimOnTrack", function () {
    return Re;
  }), n.d(r, "shimGetSendersWithDtmf", function () {
    return ke;
  }), n.d(r, "shimGetStats", function () {
    return xe;
  }), n.d(r, "shimSenderReceiverGetStats", function () {
    return Me;
  }), n.d(r, "shimAddTrackRemoveTrackWithNative", function () {
    return De;
  }), n.d(r, "shimAddTrackRemoveTrack", function () {
    return Oe;
  }), n.d(r, "shimPeerConnection", function () {
    return Le;
  }), n.d(r, "fixNegotiationNeeded", function () {
    return Pe;
  });var i = {};n.r(i), n.d(i, "shimGetUserMedia", function () {
    return Ue;
  }), n.d(i, "shimGetDisplayMedia", function () {
    return Fe;
  }), n.d(i, "shimPeerConnection", function () {
    return He;
  }), n.d(i, "shimReplaceTrack", function () {
    return qe;
  });var o = {};n.r(o), n.d(o, "shimGetUserMedia", function () {
    return ze;
  }), n.d(o, "shimGetDisplayMedia", function () {
    return Ge;
  }), n.d(o, "shimOnTrack", function () {
    return Ve;
  }), n.d(o, "shimPeerConnection", function () {
    return Be;
  }), n.d(o, "shimSenderGetStats", function () {
    return We;
  }), n.d(o, "shimReceiverGetStats", function () {
    return Ye;
  }), n.d(o, "shimRemoveStream", function () {
    return Ke;
  }), n.d(o, "shimRTCDataChannel", function () {
    return Je;
  }), n.d(o, "shimAddTransceiver", function () {
    return Qe;
  }), n.d(o, "shimCreateOffer", function () {
    return $e;
  }), n.d(o, "shimCreateAnswer", function () {
    return Ze;
  });var s = {};n.r(s), n.d(s, "shimLocalStreamsAPI", function () {
    return Xe;
  }), n.d(s, "shimRemoteStreamsAPI", function () {
    return et;
  }), n.d(s, "shimCallbacksAPI", function () {
    return tt;
  }), n.d(s, "shimGetUserMedia", function () {
    return nt;
  }), n.d(s, "shimConstraints", function () {
    return rt;
  }), n.d(s, "shimRTCIceServerUrls", function () {
    return it;
  }), n.d(s, "shimTrackEventTransceiver", function () {
    return ot;
  }), n.d(s, "shimCreateOfferLegacy", function () {
    return st;
  });var a = {};function l(e) {
    return (l = "function" == typeof Symbol && "symbol" == (0, _typeof3.default)(Symbol.iterator) ? function (e) {
      return typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e);
    })(e);
  }function u(e, t, n) {
    return t in e ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = n, e;
  }function c(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = null != arguments[t] ? Object(arguments[t]) : {},
          r = Object.keys(n);"function" == typeof Object.getOwnPropertySymbols && r.push.apply(r, Object.getOwnPropertySymbols(n).filter(function (e) {
        return Object.getOwnPropertyDescriptor(n, e).enumerable;
      })), r.forEach(function (t) {
        u(e, t, n[t]);
      });
    }return e;
  }function d(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }function h(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }function f(e, t, n) {
    return t && h(e.prototype, t), n && h(e, n), Object.defineProperty(e, "prototype", { writable: !1 }), e;
  }function p(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;
  }function g(e, t) {
    if (t && ("object" === l(t) || "function" == typeof t)) return t;if (void 0 !== t) throw new TypeError("Derived constructors may only return object or undefined");return p(e);
  }function _(e) {
    return (_ = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }function m(e, t) {
    return (m = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }function v(e, t) {
    if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");e.prototype = Object.create(t && t.prototype, { constructor: { value: e, writable: !0, configurable: !0 } }), Object.defineProperty(e, "prototype", { writable: !1 }), t && m(e, t);
  }n.r(a), n.d(a, "shimRTCIceCandidate", function () {
    return ut;
  }), n.d(a, "shimMaxMessageSize", function () {
    return ct;
  }), n.d(a, "shimSendThrowTypeError", function () {
    return dt;
  }), n.d(a, "shimConnectionState", function () {
    return ht;
  }), n.d(a, "removeAllowExtmapMixed", function () {
    return ft;
  });var y = { type: "logger", log: function log(e) {
      this.output("log", e);
    }, warn: function warn(e) {
      this.output("warn", e);
    }, error: function error(e) {
      this.output("error", e);
    }, output: function output(e, t) {
      console && console[e] && console[e].apply(console, t);
    } },
      b = new (function () {
    function e(t) {
      var n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};d(this, e), this.init(t, n);
    }return f(e, [{ key: "init", value: function value(e) {
        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};this.prefix = t.prefix || "i18next:", this.logger = e || y, this.options = t, this.debug = t.debug;
      } }, { key: "setDebug", value: function value(e) {
        this.debug = e;
      } }, { key: "log", value: function value() {
        for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
          t[n] = arguments[n];
        }return this.forward(t, "log", "", !0);
      } }, { key: "warn", value: function value() {
        for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
          t[n] = arguments[n];
        }return this.forward(t, "warn", "", !0);
      } }, { key: "error", value: function value() {
        for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
          t[n] = arguments[n];
        }return this.forward(t, "error", "");
      } }, { key: "deprecate", value: function value() {
        for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
          t[n] = arguments[n];
        }return this.forward(t, "warn", "WARNING DEPRECATED: ", !0);
      } }, { key: "forward", value: function value(e, t, n, r) {
        return r && !this.debug ? null : ("string" == typeof e[0] && (e[0] = "".concat(n).concat(this.prefix, " ").concat(e[0])), this.logger[t](e));
      } }, { key: "create", value: function value(t) {
        return new e(this.logger, c({}, { prefix: "".concat(this.prefix, ":").concat(t, ":") }, this.options));
      } }]), e;
  }())(),
      C = function () {
    function e() {
      d(this, e), this.observers = {};
    }return f(e, [{ key: "on", value: function value(e, t) {
        var n = this;return e.split(" ").forEach(function (e) {
          n.observers[e] = n.observers[e] || [], n.observers[e].push(t);
        }), this;
      } }, { key: "off", value: function value(e, t) {
        this.observers[e] && (t ? this.observers[e] = this.observers[e].filter(function (e) {
          return e !== t;
        }) : delete this.observers[e]);
      } }, { key: "emit", value: function value(e) {
        for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) {
          n[r - 1] = arguments[r];
        }if (this.observers[e]) {
          var i = [].concat(this.observers[e]);i.forEach(function (e) {
            e.apply(void 0, n);
          });
        }if (this.observers["*"]) {
          var o = [].concat(this.observers["*"]);o.forEach(function (t) {
            t.apply(t, [e].concat(n));
          });
        }
      } }]), e;
  }();function T() {
    var e,
        t,
        n = new Promise(function (n, r) {
      e = n, t = r;
    });return n.resolve = e, n.reject = t, n;
  }function w(e) {
    return null == e ? "" : "" + e;
  }function S(e, t, n) {
    e.forEach(function (e) {
      t[e] && (n[e] = t[e]);
    });
  }function A(e, t, n) {
    function r(e) {
      return e && e.indexOf("###") > -1 ? e.replace(/###/g, ".") : e;
    }function i() {
      return !e || "string" == typeof e;
    }for (var o = "string" != typeof t ? [].concat(t) : t.split("."); o.length > 1;) {
      if (i()) return {};var s = r(o.shift());!e[s] && n && (e[s] = new n()), e = Object.prototype.hasOwnProperty.call(e, s) ? e[s] : {};
    }return i() ? {} : { obj: e, k: r(o.shift()) };
  }function E(e, t, n) {
    var r = A(e, t, Object);r.obj[r.k] = n;
  }function I(e, t) {
    var n = A(e, t),
        r = n.obj,
        i = n.k;if (r) return r[i];
  }function R(e, t, n) {
    var r = I(e, n);return void 0 !== r ? r : I(t, n);
  }function k(e, t, n) {
    for (var r in t) {
      "__proto__" !== r && "constructor" !== r && (r in e ? "string" == typeof e[r] || e[r] instanceof String || "string" == typeof t[r] || t[r] instanceof String ? n && (e[r] = t[r]) : k(e[r], t[r], n) : e[r] = t[r]);
    }return e;
  }function x(e) {
    return e.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }var M = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "/": "&#x2F;" };function D(e) {
    return "string" == typeof e ? e.replace(/[&<>"'\/]/g, function (e) {
      return M[e];
    }) : e;
  }var O = "undefined" != typeof window && window.navigator && window.navigator.userAgent && window.navigator.userAgent.indexOf("MSIE") > -1,
      L = function (e) {
    function t(e) {
      var n,
          r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : { ns: ["translation"], defaultNS: "translation" };return d(this, t), n = g(this, _(t).call(this)), O && C.call(p(n)), n.data = e || {}, n.options = r, void 0 === n.options.keySeparator && (n.options.keySeparator = "."), n;
    }return v(t, e), f(t, [{ key: "addNamespaces", value: function value(e) {
        this.options.ns.indexOf(e) < 0 && this.options.ns.push(e);
      } }, { key: "removeNamespaces", value: function value(e) {
        var t = this.options.ns.indexOf(e);t > -1 && this.options.ns.splice(t, 1);
      } }, { key: "getResource", value: function value(e, t, n) {
        var r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {},
            i = void 0 !== r.keySeparator ? r.keySeparator : this.options.keySeparator,
            o = [e, t];return n && "string" != typeof n && (o = o.concat(n)), n && "string" == typeof n && (o = o.concat(i ? n.split(i) : n)), e.indexOf(".") > -1 && (o = e.split(".")), I(this.data, o);
      } }, { key: "addResource", value: function value(e, t, n, r) {
        var i = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : { silent: !1 },
            o = this.options.keySeparator;void 0 === o && (o = ".");var s = [e, t];n && (s = s.concat(o ? n.split(o) : n)), e.indexOf(".") > -1 && (r = t, t = (s = e.split("."))[1]), this.addNamespaces(t), E(this.data, s, r), i.silent || this.emit("added", e, t, n, r);
      } }, { key: "addResources", value: function value(e, t, n) {
        var r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : { silent: !1 };for (var i in n) {
          "string" != typeof n[i] && "[object Array]" !== Object.prototype.toString.apply(n[i]) || this.addResource(e, t, i, n[i], { silent: !0 });
        }r.silent || this.emit("added", e, t, n);
      } }, { key: "addResourceBundle", value: function value(e, t, n, r, i) {
        var o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : { silent: !1 },
            s = [e, t];e.indexOf(".") > -1 && (r = n, n = t, t = (s = e.split("."))[1]), this.addNamespaces(t);var a = I(this.data, s) || {};r ? k(a, n, i) : a = c({}, a, n), E(this.data, s, a), o.silent || this.emit("added", e, t, n);
      } }, { key: "removeResourceBundle", value: function value(e, t) {
        this.hasResourceBundle(e, t) && delete this.data[e][t], this.removeNamespaces(t), this.emit("removed", e, t);
      } }, { key: "hasResourceBundle", value: function value(e, t) {
        return void 0 !== this.getResource(e, t);
      } }, { key: "getResourceBundle", value: function value(e, t) {
        return t || (t = this.options.defaultNS), "v1" === this.options.compatibilityAPI ? c({}, {}, this.getResource(e, t)) : this.getResource(e, t);
      } }, { key: "getDataByLanguage", value: function value(e) {
        return this.data[e];
      } }, { key: "toJSON", value: function value() {
        return this.data;
      } }]), t;
  }(C),
      P = { processors: {}, addPostProcessor: function addPostProcessor(e) {
      this.processors[e.name] = e;
    }, handle: function handle(e, t, n, r, i) {
      var o = this;return e.forEach(function (e) {
        o.processors[e] && (t = o.processors[e].process(t, n, r, i));
      }), t;
    } },
      N = {},
      j = function (e) {
    function t(e) {
      var n,
          r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};return d(this, t), n = g(this, _(t).call(this)), O && C.call(p(n)), S(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], e, p(n)), n.options = r, void 0 === n.options.keySeparator && (n.options.keySeparator = "."), n.logger = b.create("translator"), n;
    }return v(t, e), f(t, [{ key: "changeLanguage", value: function value(e) {
        e && (this.language = e);
      } }, { key: "exists", value: function value(e) {
        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : { interpolation: {} },
            n = this.resolve(e, t);return n && void 0 !== n.res;
      } }, { key: "extractFromKey", value: function value(e, t) {
        var n = void 0 !== t.nsSeparator ? t.nsSeparator : this.options.nsSeparator;void 0 === n && (n = ":");var r = void 0 !== t.keySeparator ? t.keySeparator : this.options.keySeparator,
            i = t.ns || this.options.defaultNS;if (n && e.indexOf(n) > -1) {
          var o = e.match(this.interpolator.nestingRegexp);if (o && o.length > 0) return { key: e, namespaces: i };var s = e.split(n);(n !== r || n === r && this.options.ns.indexOf(s[0]) > -1) && (i = s.shift()), e = s.join(r);
        }return "string" == typeof i && (i = [i]), { key: e, namespaces: i };
      } }, { key: "translate", value: function value(e, n, r) {
        var i = this;if ("object" !== l(n) && this.options.overloadTranslationOptionHandler && (n = this.options.overloadTranslationOptionHandler(arguments)), n || (n = {}), null == e) return "";Array.isArray(e) || (e = [String(e)]);var o = void 0 !== n.keySeparator ? n.keySeparator : this.options.keySeparator,
            s = this.extractFromKey(e[e.length - 1], n),
            a = s.key,
            u = s.namespaces,
            d = u[u.length - 1],
            h = n.lng || this.language,
            f = n.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;if (h && "cimode" === h.toLowerCase()) {
          if (f) {
            var p = n.nsSeparator || this.options.nsSeparator;return d + p + a;
          }return a;
        }var g = this.resolve(e, n),
            _ = g && g.res,
            m = g && g.usedKey || a,
            v = g && g.exactUsedKey || a,
            y = Object.prototype.toString.apply(_),
            b = ["[object Number]", "[object Function]", "[object RegExp]"],
            C = void 0 !== n.joinArrays ? n.joinArrays : this.options.joinArrays,
            T = !this.i18nFormat || this.i18nFormat.handleAsObject,
            w = "string" != typeof _ && "boolean" != typeof _ && "number" != typeof _;if (T && _ && w && b.indexOf(y) < 0 && ("string" != typeof C || "[object Array]" !== y)) {
          if (!n.returnObjects && !this.options.returnObjects) return this.logger.warn("accessing an object - but returnObjects options is not enabled!"), this.options.returnedObjectHandler ? this.options.returnedObjectHandler(m, _, n) : "key '".concat(a, " (").concat(this.language, ")' returned an object instead of string.");if (o) {
            var S = "[object Array]" === y,
                A = S ? [] : {},
                E = S ? v : m;for (var I in _) {
              if (Object.prototype.hasOwnProperty.call(_, I)) {
                var R = "".concat(E).concat(o).concat(I);A[I] = this.translate(R, c({}, n, { joinArrays: !1, ns: u })), A[I] === R && (A[I] = _[I]);
              }
            }_ = A;
          }
        } else if (T && "string" == typeof C && "[object Array]" === y) (_ = _.join(C)) && (_ = this.extendTranslation(_, e, n, r));else {
          var k = !1,
              x = !1,
              M = void 0 !== n.count && "string" != typeof n.count,
              D = t.hasDefaultValue(n),
              O = M ? this.pluralResolver.getSuffix(h, n.count) : "",
              L = n["defaultValue".concat(O)] || n.defaultValue;!this.isValidLookup(_) && D && (k = !0, _ = L), this.isValidLookup(_) || (x = !0, _ = a);var P = D && L !== _ && this.options.updateMissing;if (x || k || P) {
            if (this.logger.log(P ? "updateKey" : "missingKey", h, d, a, P ? L : _), o) {
              var N = this.resolve(a, c({}, n, { keySeparator: !1 }));N && N.res && this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
            }var j = [],
                U = this.languageUtils.getFallbackCodes(this.options.fallbackLng, n.lng || this.language);if ("fallback" === this.options.saveMissingTo && U && U[0]) for (var F = 0; F < U.length; F++) {
              j.push(U[F]);
            } else "all" === this.options.saveMissingTo ? j = this.languageUtils.toResolveHierarchy(n.lng || this.language) : j.push(n.lng || this.language);var H = function H(e, t, r) {
              i.options.missingKeyHandler ? i.options.missingKeyHandler(e, d, t, P ? r : _, P, n) : i.backendConnector && i.backendConnector.saveMissing && i.backendConnector.saveMissing(e, d, t, P ? r : _, P, n), i.emit("missingKey", e, d, t, _);
            };this.options.saveMissing && (this.options.saveMissingPlurals && M ? j.forEach(function (e) {
              i.pluralResolver.getSuffixes(e).forEach(function (t) {
                H([e], a + t, n["defaultValue".concat(t)] || L);
              });
            }) : H(j, a, L));
          }_ = this.extendTranslation(_, e, n, g, r), x && _ === a && this.options.appendNamespaceToMissingKey && (_ = "".concat(d, ":").concat(a)), x && this.options.parseMissingKeyHandler && (_ = this.options.parseMissingKeyHandler(_));
        }return _;
      } }, { key: "extendTranslation", value: function value(e, t, n, r, i) {
        var o = this;if (this.i18nFormat && this.i18nFormat.parse) e = this.i18nFormat.parse(e, n, r.usedLng, r.usedNS, r.usedKey, { resolved: r });else if (!n.skipInterpolation) {
          n.interpolation && this.interpolator.init(c({}, n, { interpolation: c({}, this.options.interpolation, n.interpolation) }));var s,
              a = n.interpolation && n.interpolation.skipOnVariables || this.options.interpolation.skipOnVariables;if (a) {
            var l = e.match(this.interpolator.nestingRegexp);s = l && l.length;
          }var u = n.replace && "string" != typeof n.replace ? n.replace : n;if (this.options.interpolation.defaultVariables && (u = c({}, this.options.interpolation.defaultVariables, u)), e = this.interpolator.interpolate(e, u, n.lng || this.language, n), a) {
            var d = e.match(this.interpolator.nestingRegexp);s < (d && d.length) && (n.nest = !1);
          }!1 !== n.nest && (e = this.interpolator.nest(e, function () {
            for (var e = arguments.length, r = new Array(e), s = 0; s < e; s++) {
              r[s] = arguments[s];
            }return i && i[0] === r[0] && !n.context ? (o.logger.warn("It seems you are nesting recursively key: ".concat(r[0], " in key: ").concat(t[0])), null) : o.translate.apply(o, r.concat([t]));
          }, n)), n.interpolation && this.interpolator.reset();
        }var h = n.postProcess || this.options.postProcess,
            f = "string" == typeof h ? [h] : h;return null != e && f && f.length && !1 !== n.applyPostProcessor && (e = P.handle(f, e, t, this.options && this.options.postProcessPassResolved ? c({ i18nResolved: r }, n) : n, this)), e;
      } }, { key: "resolve", value: function value(e) {
        var t,
            n,
            r,
            i,
            o,
            s = this,
            a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};return "string" == typeof e && (e = [e]), e.forEach(function (e) {
          if (!s.isValidLookup(t)) {
            var l = s.extractFromKey(e, a),
                u = l.key;n = u;var c = l.namespaces;s.options.fallbackNS && (c = c.concat(s.options.fallbackNS));var d = void 0 !== a.count && "string" != typeof a.count,
                h = void 0 !== a.context && "string" == typeof a.context && "" !== a.context,
                f = a.lngs ? a.lngs : s.languageUtils.toResolveHierarchy(a.lng || s.language, a.fallbackLng);c.forEach(function (e) {
              s.isValidLookup(t) || (o = e, !N["".concat(f[0], "-").concat(e)] && s.utils && s.utils.hasLoadedNamespace && !s.utils.hasLoadedNamespace(o) && (N["".concat(f[0], "-").concat(e)] = !0, s.logger.warn('key "'.concat(n, '" for languages "').concat(f.join(", "), '" won\'t get resolved as namespace "').concat(o, '" was not yet loaded'), "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")), f.forEach(function (n) {
                if (!s.isValidLookup(t)) {
                  i = n;var o,
                      l,
                      c = u,
                      f = [c];for (s.i18nFormat && s.i18nFormat.addLookupKeys ? s.i18nFormat.addLookupKeys(f, u, n, e, a) : (d && (o = s.pluralResolver.getSuffix(n, a.count)), d && h && f.push(c + o), h && f.push(c += "".concat(s.options.contextSeparator).concat(a.context)), d && f.push(c += o)); l = f.pop();) {
                    s.isValidLookup(t) || (r = l, t = s.getResource(n, e, l, a));
                  }
                }
              }));
            });
          }
        }), { res: t, usedKey: n, exactUsedKey: r, usedLng: i, usedNS: o };
      } }, { key: "isValidLookup", value: function value(e) {
        return !(void 0 === e || !this.options.returnNull && null === e || !this.options.returnEmptyString && "" === e);
      } }, { key: "getResource", value: function value(e, t, n) {
        var r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};return this.i18nFormat && this.i18nFormat.getResource ? this.i18nFormat.getResource(e, t, n, r) : this.resourceStore.getResource(e, t, n, r);
      } }], [{ key: "hasDefaultValue", value: function value(e) {
        for (var t in e) {
          if (Object.prototype.hasOwnProperty.call(e, t) && "defaultValue" === t.substring(0, "defaultValue".length) && void 0 !== e[t]) return !0;
        }return !1;
      } }]), t;
  }(C);function U(e) {
    return e.charAt(0).toUpperCase() + e.slice(1);
  }var F = function () {
    function e(t) {
      d(this, e), this.options = t, this.whitelist = this.options.supportedLngs || !1, this.supportedLngs = this.options.supportedLngs || !1, this.logger = b.create("languageUtils");
    }return f(e, [{ key: "getScriptPartFromCode", value: function value(e) {
        if (!e || e.indexOf("-") < 0) return null;var t = e.split("-");return 2 === t.length ? null : (t.pop(), "x" === t[t.length - 1].toLowerCase() ? null : this.formatLanguageCode(t.join("-")));
      } }, { key: "getLanguagePartFromCode", value: function value(e) {
        if (!e || e.indexOf("-") < 0) return e;var t = e.split("-");return this.formatLanguageCode(t[0]);
      } }, { key: "formatLanguageCode", value: function value(e) {
        if ("string" == typeof e && e.indexOf("-") > -1) {
          var t = ["hans", "hant", "latn", "cyrl", "cans", "mong", "arab"],
              n = e.split("-");return this.options.lowerCaseLng ? n = n.map(function (e) {
            return e.toLowerCase();
          }) : 2 === n.length ? (n[0] = n[0].toLowerCase(), n[1] = n[1].toUpperCase(), t.indexOf(n[1].toLowerCase()) > -1 && (n[1] = U(n[1].toLowerCase()))) : 3 === n.length && (n[0] = n[0].toLowerCase(), 2 === n[1].length && (n[1] = n[1].toUpperCase()), "sgn" !== n[0] && 2 === n[2].length && (n[2] = n[2].toUpperCase()), t.indexOf(n[1].toLowerCase()) > -1 && (n[1] = U(n[1].toLowerCase())), t.indexOf(n[2].toLowerCase()) > -1 && (n[2] = U(n[2].toLowerCase()))), n.join("-");
        }return this.options.cleanCode || this.options.lowerCaseLng ? e.toLowerCase() : e;
      } }, { key: "isWhitelisted", value: function value(e) {
        return this.logger.deprecate("languageUtils.isWhitelisted", 'function "isWhitelisted" will be renamed to "isSupportedCode" in the next major - please make sure to rename it\'s usage asap.'), this.isSupportedCode(e);
      } }, { key: "isSupportedCode", value: function value(e) {
        return ("languageOnly" === this.options.load || this.options.nonExplicitSupportedLngs) && (e = this.getLanguagePartFromCode(e)), !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(e) > -1;
      } }, { key: "getBestMatchFromCodes", value: function value(e) {
        var t,
            n = this;return e ? (e.forEach(function (e) {
          if (!t) {
            var r = n.formatLanguageCode(e);n.options.supportedLngs && !n.isSupportedCode(r) || (t = r);
          }
        }), !t && this.options.supportedLngs && e.forEach(function (e) {
          if (!t) {
            var r = n.getLanguagePartFromCode(e);if (n.isSupportedCode(r)) return t = r;t = n.options.supportedLngs.find(function (e) {
              if (0 === e.indexOf(r)) return e;
            });
          }
        }), t || (t = this.getFallbackCodes(this.options.fallbackLng)[0]), t) : null;
      } }, { key: "getFallbackCodes", value: function value(e, t) {
        if (!e) return [];if ("function" == typeof e && (e = e(t)), "string" == typeof e && (e = [e]), "[object Array]" === Object.prototype.toString.apply(e)) return e;if (!t) return e.default || [];var n = e[t];return n || (n = e[this.getScriptPartFromCode(t)]), n || (n = e[this.formatLanguageCode(t)]), n || (n = e[this.getLanguagePartFromCode(t)]), n || (n = e.default), n || [];
      } }, { key: "toResolveHierarchy", value: function value(e, t) {
        var n = this,
            r = this.getFallbackCodes(t || this.options.fallbackLng || [], e),
            i = [],
            o = function o(e) {
          e && (n.isSupportedCode(e) ? i.push(e) : n.logger.warn("rejecting language code not found in supportedLngs: ".concat(e)));
        };return "string" == typeof e && e.indexOf("-") > -1 ? ("languageOnly" !== this.options.load && o(this.formatLanguageCode(e)), "languageOnly" !== this.options.load && "currentOnly" !== this.options.load && o(this.getScriptPartFromCode(e)), "currentOnly" !== this.options.load && o(this.getLanguagePartFromCode(e))) : "string" == typeof e && o(this.formatLanguageCode(e)), r.forEach(function (e) {
          i.indexOf(e) < 0 && o(n.formatLanguageCode(e));
        }), i;
      } }]), e;
  }(),
      H = [{ lngs: ["ach", "ak", "am", "arn", "br", "fil", "gun", "ln", "mfe", "mg", "mi", "oc", "pt", "pt-BR", "tg", "tl", "ti", "tr", "uz", "wa"], nr: [1, 2], fc: 1 }, { lngs: ["af", "an", "ast", "az", "bg", "bn", "ca", "da", "de", "dev", "el", "en", "eo", "es", "et", "eu", "fi", "fo", "fur", "fy", "gl", "gu", "ha", "hi", "hu", "hy", "ia", "it", "kn", "ku", "lb", "mai", "ml", "mn", "mr", "nah", "nap", "nb", "ne", "nl", "nn", "no", "nso", "pa", "pap", "pms", "ps", "pt-PT", "rm", "sco", "se", "si", "so", "son", "sq", "sv", "sw", "ta", "te", "tk", "ur", "yo"], nr: [1, 2], fc: 2 }, { lngs: ["ay", "bo", "cgg", "fa", "ht", "id", "ja", "jbo", "ka", "kk", "km", "ko", "ky", "lo", "ms", "sah", "su", "th", "tt", "ug", "vi", "wo", "zh"], nr: [1], fc: 3 }, { lngs: ["be", "bs", "cnr", "dz", "hr", "ru", "sr", "uk"], nr: [1, 2, 5], fc: 4 }, { lngs: ["ar"], nr: [0, 1, 2, 3, 11, 100], fc: 5 }, { lngs: ["cs", "sk"], nr: [1, 2, 5], fc: 6 }, { lngs: ["csb", "pl"], nr: [1, 2, 5], fc: 7 }, { lngs: ["cy"], nr: [1, 2, 3, 8], fc: 8 }, { lngs: ["fr"], nr: [1, 2], fc: 9 }, { lngs: ["ga"], nr: [1, 2, 3, 7, 11], fc: 10 }, { lngs: ["gd"], nr: [1, 2, 3, 20], fc: 11 }, { lngs: ["is"], nr: [1, 2], fc: 12 }, { lngs: ["jv"], nr: [0, 1], fc: 13 }, { lngs: ["kw"], nr: [1, 2, 3, 4], fc: 14 }, { lngs: ["lt"], nr: [1, 2, 10], fc: 15 }, { lngs: ["lv"], nr: [1, 2, 0], fc: 16 }, { lngs: ["mk"], nr: [1, 2], fc: 17 }, { lngs: ["mnk"], nr: [0, 1, 2], fc: 18 }, { lngs: ["mt"], nr: [1, 2, 11, 20], fc: 19 }, { lngs: ["or"], nr: [2, 1], fc: 2 }, { lngs: ["ro"], nr: [1, 2, 20], fc: 20 }, { lngs: ["sl"], nr: [5, 1, 2, 3], fc: 21 }, { lngs: ["he", "iw"], nr: [1, 2, 20, 21], fc: 22 }],
      q = { 1: function _(e) {
      return Number(e > 1);
    }, 2: function _(e) {
      return Number(1 != e);
    }, 3: function _(e) {
      return 0;
    }, 4: function _(e) {
      return Number(e % 10 == 1 && e % 100 != 11 ? 0 : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2);
    }, 5: function _(e) {
      return Number(0 == e ? 0 : 1 == e ? 1 : 2 == e ? 2 : e % 100 >= 3 && e % 100 <= 10 ? 3 : e % 100 >= 11 ? 4 : 5);
    }, 6: function _(e) {
      return Number(1 == e ? 0 : e >= 2 && e <= 4 ? 1 : 2);
    }, 7: function _(e) {
      return Number(1 == e ? 0 : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2);
    }, 8: function _(e) {
      return Number(1 == e ? 0 : 2 == e ? 1 : 8 != e && 11 != e ? 2 : 3);
    }, 9: function _(e) {
      return Number(e >= 2);
    }, 10: function _(e) {
      return Number(1 == e ? 0 : 2 == e ? 1 : e < 7 ? 2 : e < 11 ? 3 : 4);
    }, 11: function _(e) {
      return Number(1 == e || 11 == e ? 0 : 2 == e || 12 == e ? 1 : e > 2 && e < 20 ? 2 : 3);
    }, 12: function _(e) {
      return Number(e % 10 != 1 || e % 100 == 11);
    }, 13: function _(e) {
      return Number(0 !== e);
    }, 14: function _(e) {
      return Number(1 == e ? 0 : 2 == e ? 1 : 3 == e ? 2 : 3);
    }, 15: function _(e) {
      return Number(e % 10 == 1 && e % 100 != 11 ? 0 : e % 10 >= 2 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2);
    }, 16: function _(e) {
      return Number(e % 10 == 1 && e % 100 != 11 ? 0 : 0 !== e ? 1 : 2);
    }, 17: function _(e) {
      return Number(1 == e || e % 10 == 1 && e % 100 != 11 ? 0 : 1);
    }, 18: function _(e) {
      return Number(0 == e ? 0 : 1 == e ? 1 : 2);
    }, 19: function _(e) {
      return Number(1 == e ? 0 : 0 == e || e % 100 > 1 && e % 100 < 11 ? 1 : e % 100 > 10 && e % 100 < 20 ? 2 : 3);
    }, 20: function _(e) {
      return Number(1 == e ? 0 : 0 == e || e % 100 > 0 && e % 100 < 20 ? 1 : 2);
    }, 21: function _(e) {
      return Number(e % 100 == 1 ? 1 : e % 100 == 2 ? 2 : e % 100 == 3 || e % 100 == 4 ? 3 : 0);
    }, 22: function _(e) {
      return Number(1 == e ? 0 : 2 == e ? 1 : (e < 0 || e > 10) && e % 10 == 0 ? 2 : 3);
    } };function z() {
    var e = {};return H.forEach(function (t) {
      t.lngs.forEach(function (n) {
        e[n] = { numbers: t.nr, plurals: q[t.fc] };
      });
    }), e;
  }var G = function () {
    function e(t) {
      var n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};d(this, e), this.languageUtils = t, this.options = n, this.logger = b.create("pluralResolver"), this.rules = z();
    }return f(e, [{ key: "addRule", value: function value(e, t) {
        this.rules[e] = t;
      } }, { key: "getRule", value: function value(e) {
        return this.rules[e] || this.rules[this.languageUtils.getLanguagePartFromCode(e)];
      } }, { key: "needsPlural", value: function value(e) {
        var t = this.getRule(e);return t && t.numbers.length > 1;
      } }, { key: "getPluralFormsOfKey", value: function value(e, t) {
        return this.getSuffixes(e).map(function (e) {
          return t + e;
        });
      } }, { key: "getSuffixes", value: function value(e) {
        var t = this,
            n = this.getRule(e);return n ? n.numbers.map(function (n) {
          return t.getSuffix(e, n);
        }) : [];
      } }, { key: "getSuffix", value: function value(e, t) {
        var n = this,
            r = this.getRule(e);if (r) {
          var i = r.noAbs ? r.plurals(t) : r.plurals(Math.abs(t)),
              o = r.numbers[i];this.options.simplifyPluralSuffix && 2 === r.numbers.length && 1 === r.numbers[0] && (2 === o ? o = "plural" : 1 === o && (o = ""));var s = function s() {
            return n.options.prepend && o.toString() ? n.options.prepend + o.toString() : o.toString();
          };return "v1" === this.options.compatibilityJSON ? 1 === o ? "" : "number" == typeof o ? "_plural_".concat(o.toString()) : s() : "v2" === this.options.compatibilityJSON || this.options.simplifyPluralSuffix && 2 === r.numbers.length && 1 === r.numbers[0] ? s() : this.options.prepend && i.toString() ? this.options.prepend + i.toString() : i.toString();
        }return this.logger.warn("no plural rule found for: ".concat(e)), "";
      } }]), e;
  }(),
      V = function () {
    function e() {
      var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};d(this, e), this.logger = b.create("interpolator"), this.options = t, this.format = t.interpolation && t.interpolation.format || function (e) {
        return e;
      }, this.init(t);
    }return f(e, [{ key: "init", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};e.interpolation || (e.interpolation = { escapeValue: !0 });var t = e.interpolation;this.escape = void 0 !== t.escape ? t.escape : D, this.escapeValue = void 0 === t.escapeValue || t.escapeValue, this.useRawValueToEscape = void 0 !== t.useRawValueToEscape && t.useRawValueToEscape, this.prefix = t.prefix ? x(t.prefix) : t.prefixEscaped || "{{", this.suffix = t.suffix ? x(t.suffix) : t.suffixEscaped || "}}", this.formatSeparator = t.formatSeparator ? t.formatSeparator : t.formatSeparator || ",", this.unescapePrefix = t.unescapeSuffix ? "" : t.unescapePrefix || "-", this.unescapeSuffix = this.unescapePrefix ? "" : t.unescapeSuffix || "", this.nestingPrefix = t.nestingPrefix ? x(t.nestingPrefix) : t.nestingPrefixEscaped || x("$t("), this.nestingSuffix = t.nestingSuffix ? x(t.nestingSuffix) : t.nestingSuffixEscaped || x(")"), this.nestingOptionsSeparator = t.nestingOptionsSeparator ? t.nestingOptionsSeparator : t.nestingOptionsSeparator || ",", this.maxReplaces = t.maxReplaces ? t.maxReplaces : 1e3, this.alwaysFormat = void 0 !== t.alwaysFormat && t.alwaysFormat, this.resetRegExp();
      } }, { key: "reset", value: function value() {
        this.options && this.init(this.options);
      } }, { key: "resetRegExp", value: function value() {
        var e = "".concat(this.prefix, "(.+?)").concat(this.suffix);this.regexp = new RegExp(e, "g");var t = "".concat(this.prefix).concat(this.unescapePrefix, "(.+?)").concat(this.unescapeSuffix).concat(this.suffix);this.regexpUnescape = new RegExp(t, "g");var n = "".concat(this.nestingPrefix, "(.+?)").concat(this.nestingSuffix);this.nestingRegexp = new RegExp(n, "g");
      } }, { key: "interpolate", value: function value(e, t, n, r) {
        var i,
            o,
            s,
            a = this,
            l = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};function u(e) {
          return e.replace(/\$/g, "$$$$");
        }var c = function c(e) {
          if (e.indexOf(a.formatSeparator) < 0) {
            var i = R(t, l, e);return a.alwaysFormat ? a.format(i, void 0, n) : i;
          }var o = e.split(a.formatSeparator),
              s = o.shift().trim(),
              u = o.join(a.formatSeparator).trim();return a.format(R(t, l, s), u, n, r);
        };this.resetRegExp();var d = r && r.missingInterpolationHandler || this.options.missingInterpolationHandler,
            h = r && r.interpolation && r.interpolation.skipOnVariables || this.options.interpolation.skipOnVariables;return [{ regex: this.regexpUnescape, safeValue: function safeValue(e) {
            return u(e);
          } }, { regex: this.regexp, safeValue: function safeValue(e) {
            return a.escapeValue ? u(a.escape(e)) : u(e);
          } }].forEach(function (t) {
          for (s = 0; i = t.regex.exec(e);) {
            if (void 0 === (o = c(i[1].trim()))) {
              if ("function" == typeof d) {
                var n = d(e, i, r);o = "string" == typeof n ? n : "";
              } else {
                if (h) {
                  o = i[0];continue;
                }a.logger.warn("missed to pass in variable ".concat(i[1], " for interpolating ").concat(e)), o = "";
              }
            } else "string" == typeof o || a.useRawValueToEscape || (o = w(o));if (e = e.replace(i[0], t.safeValue(o)), t.regex.lastIndex = 0, ++s >= a.maxReplaces) break;
          }
        }), e;
      } }, { key: "nest", value: function value(e, t) {
        var n,
            r,
            i = this,
            o = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
            s = c({}, o);function a(e, t) {
          var n = this.nestingOptionsSeparator;if (e.indexOf(n) < 0) return e;var r = e.split(new RegExp("".concat(n, "[ ]*{"))),
              i = "{".concat(r[1]);e = r[0], i = (i = this.interpolate(i, s)).replace(/'/g, '"');try {
            s = JSON.parse(i), t && (s = c({}, t, s));
          } catch (t) {
            return this.logger.warn("failed parsing options string in nesting for key ".concat(e), t), "".concat(e).concat(n).concat(i);
          }return delete s.defaultValue, e;
        }for (s.applyPostProcessor = !1, delete s.defaultValue; n = this.nestingRegexp.exec(e);) {
          var l = [],
              u = !1;if (n[0].includes(this.formatSeparator) && !/{.*}/.test(n[1])) {
            var d = n[1].split(this.formatSeparator).map(function (e) {
              return e.trim();
            });n[1] = d.shift(), l = d, u = !0;
          }if ((r = t(a.call(this, n[1].trim(), s), s)) && n[0] === e && "string" != typeof r) return r;"string" != typeof r && (r = w(r)), r || (this.logger.warn("missed to resolve ".concat(n[1], " for nesting ").concat(e)), r = ""), u && (r = l.reduce(function (e, t) {
            return i.format(e, t, o.lng, o);
          }, r.trim())), e = e.replace(n[0], r), this.regexp.lastIndex = 0;
        }return e;
      } }]), e;
  }(),
      B = function (e) {
    function t(e, n, r) {
      var i,
          o = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};return d(this, t), i = g(this, _(t).call(this)), O && C.call(p(i)), i.backend = e, i.store = n, i.services = r, i.languageUtils = r.languageUtils, i.options = o, i.logger = b.create("backendConnector"), i.state = {}, i.queue = [], i.backend && i.backend.init && i.backend.init(r, o.backend, o), i;
    }return v(t, e), f(t, [{ key: "queueLoad", value: function value(e, t, n, r) {
        var i = this,
            o = [],
            s = [],
            a = [],
            l = [];return e.forEach(function (e) {
          var r = !0;t.forEach(function (t) {
            var a = "".concat(e, "|").concat(t);!n.reload && i.store.hasResourceBundle(e, t) ? i.state[a] = 2 : i.state[a] < 0 || (1 === i.state[a] ? s.indexOf(a) < 0 && s.push(a) : (i.state[a] = 1, r = !1, s.indexOf(a) < 0 && s.push(a), o.indexOf(a) < 0 && o.push(a), l.indexOf(t) < 0 && l.push(t)));
          }), r || a.push(e);
        }), (o.length || s.length) && this.queue.push({ pending: s, loaded: {}, errors: [], callback: r }), { toLoad: o, pending: s, toLoadLanguages: a, toLoadNamespaces: l };
      } }, { key: "loaded", value: function value(e, t, n) {
        var r = e.split("|"),
            i = r[0],
            o = r[1];t && this.emit("failedLoading", i, o, t), n && this.store.addResourceBundle(i, o, n), this.state[e] = t ? -1 : 2;var s = {};this.queue.forEach(function (n) {
          var r, a, l, u, c, d;r = n.loaded, a = o, u = A(r, [i], Object), c = u.obj, d = u.k, c[d] = c[d] || [], l && (c[d] = c[d].concat(a)), l || c[d].push(a), function (e, t) {
            for (var n = e.indexOf(t); -1 !== n;) {
              e.splice(n, 1), n = e.indexOf(t);
            }
          }(n.pending, e), t && n.errors.push(t), 0 !== n.pending.length || n.done || (Object.keys(n.loaded).forEach(function (e) {
            s[e] || (s[e] = []), n.loaded[e].length && n.loaded[e].forEach(function (t) {
              s[e].indexOf(t) < 0 && s[e].push(t);
            });
          }), n.done = !0, n.errors.length ? n.callback(n.errors) : n.callback());
        }), this.emit("loaded", s), this.queue = this.queue.filter(function (e) {
          return !e.done;
        });
      } }, { key: "read", value: function value(e, t, n) {
        var r = this,
            i = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 0,
            o = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : 350,
            s = arguments.length > 5 ? arguments[5] : void 0;return e.length ? this.backend[n](e, t, function (a, l) {
          a && l && i < 5 ? setTimeout(function () {
            r.read.call(r, e, t, n, i + 1, 2 * o, s);
          }, o) : s(a, l);
        }) : s(null, {});
      } }, { key: "prepareLoading", value: function value(e, t) {
        var n = this,
            r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
            i = arguments.length > 3 ? arguments[3] : void 0;if (!this.backend) return this.logger.warn("No backend was added via i18next.use. Will not load resources."), i && i();"string" == typeof e && (e = this.languageUtils.toResolveHierarchy(e)), "string" == typeof t && (t = [t]);var o = this.queueLoad(e, t, r, i);if (!o.toLoad.length) return o.pending.length || i(), null;o.toLoad.forEach(function (e) {
          n.loadOne(e);
        });
      } }, { key: "load", value: function value(e, t, n) {
        this.prepareLoading(e, t, {}, n);
      } }, { key: "reload", value: function value(e, t, n) {
        this.prepareLoading(e, t, { reload: !0 }, n);
      } }, { key: "loadOne", value: function value(e) {
        var t = this,
            n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "",
            r = e.split("|"),
            i = r[0],
            o = r[1];this.read(i, o, "read", void 0, void 0, function (r, s) {
          r && t.logger.warn("".concat(n, "loading namespace ").concat(o, " for language ").concat(i, " failed"), r), !r && s && t.logger.log("".concat(n, "loaded namespace ").concat(o, " for language ").concat(i), s), t.loaded(e, r, s);
        });
      } }, { key: "saveMissing", value: function value(e, t, n, r, i) {
        var o = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : {};this.services.utils && this.services.utils.hasLoadedNamespace && !this.services.utils.hasLoadedNamespace(t) ? this.logger.warn('did not save key "'.concat(n, '" as the namespace "').concat(t, '" was not yet loaded'), "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!") : null != n && "" !== n && (this.backend && this.backend.create && this.backend.create(e, t, n, r, null, c({}, o, { isUpdate: i })), e && e[0] && this.store.addResource(e[0], t, n, r));
      } }]), t;
  }(C);function W() {
    return { debug: !1, initImmediate: !0, ns: ["translation"], defaultNS: ["translation"], fallbackLng: ["dev"], fallbackNS: !1, whitelist: !1, nonExplicitWhitelist: !1, supportedLngs: !1, nonExplicitSupportedLngs: !1, load: "all", preload: !1, simplifyPluralSuffix: !0, keySeparator: ".", nsSeparator: ":", pluralSeparator: "_", contextSeparator: "_", partialBundledLanguages: !1, saveMissing: !1, updateMissing: !1, saveMissingTo: "fallback", saveMissingPlurals: !0, missingKeyHandler: !1, missingInterpolationHandler: !1, postProcess: !1, postProcessPassResolved: !1, returnNull: !0, returnEmptyString: !0, returnObjects: !1, joinArrays: !1, returnedObjectHandler: !1, parseMissingKeyHandler: !1, appendNamespaceToMissingKey: !1, appendNamespaceToCIMode: !1, overloadTranslationOptionHandler: function overloadTranslationOptionHandler(e) {
        var t = {};if ("object" === l(e[1]) && (t = e[1]), "string" == typeof e[1] && (t.defaultValue = e[1]), "string" == typeof e[2] && (t.tDescription = e[2]), "object" === l(e[2]) || "object" === l(e[3])) {
          var n = e[3] || e[2];Object.keys(n).forEach(function (e) {
            t[e] = n[e];
          });
        }return t;
      }, interpolation: { escapeValue: !0, format: function format(e, t, n, r) {
          return e;
        }, prefix: "{{", suffix: "}}", formatSeparator: ",", unescapePrefix: "-", nestingPrefix: "$t(", nestingSuffix: ")", nestingOptionsSeparator: ",", maxReplaces: 1e3, skipOnVariables: !1 } };
  }function Y(e) {
    return "string" == typeof e.ns && (e.ns = [e.ns]), "string" == typeof e.fallbackLng && (e.fallbackLng = [e.fallbackLng]), "string" == typeof e.fallbackNS && (e.fallbackNS = [e.fallbackNS]), e.whitelist && (e.whitelist && e.whitelist.indexOf("cimode") < 0 && (e.whitelist = e.whitelist.concat(["cimode"])), e.supportedLngs = e.whitelist), e.nonExplicitWhitelist && (e.nonExplicitSupportedLngs = e.nonExplicitWhitelist), e.supportedLngs && e.supportedLngs.indexOf("cimode") < 0 && (e.supportedLngs = e.supportedLngs.concat(["cimode"])), e;
  }function K() {}var J = new (function (e) {
    function t() {
      var e,
          n = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
          r = arguments.length > 1 ? arguments[1] : void 0;if (d(this, t), e = g(this, _(t).call(this)), O && C.call(p(e)), e.options = Y(n), e.services = {}, e.logger = b, e.modules = { external: [] }, r && !e.isInitialized && !n.isClone) {
        if (!e.options.initImmediate) return e.init(n, r), g(e, p(e));setTimeout(function () {
          e.init(n, r);
        }, 0);
      }return e;
    }return v(t, e), f(t, [{ key: "init", value: function value() {
        var e = this,
            t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            n = arguments.length > 1 ? arguments[1] : void 0;function r(e) {
          return e ? "function" == typeof e ? new e() : e : null;
        }if ("function" == typeof t && (n = t, t = {}), t.whitelist && !t.supportedLngs && this.logger.deprecate("whitelist", 'option "whitelist" will be renamed to "supportedLngs" in the next major - please make sure to rename this option asap.'), t.nonExplicitWhitelist && !t.nonExplicitSupportedLngs && this.logger.deprecate("whitelist", 'options "nonExplicitWhitelist" will be renamed to "nonExplicitSupportedLngs" in the next major - please make sure to rename this option asap.'), this.options = c({}, W(), this.options, Y(t)), this.format = this.options.interpolation.format, n || (n = K), !this.options.isClone) {
          this.modules.logger ? b.init(r(this.modules.logger), this.options) : b.init(null, this.options);var i = new F(this.options);this.store = new L(this.options.resources, this.options);var o = this.services;o.logger = b, o.resourceStore = this.store, o.languageUtils = i, o.pluralResolver = new G(i, { prepend: this.options.pluralSeparator, compatibilityJSON: this.options.compatibilityJSON, simplifyPluralSuffix: this.options.simplifyPluralSuffix }), o.interpolator = new V(this.options), o.utils = { hasLoadedNamespace: this.hasLoadedNamespace.bind(this) }, o.backendConnector = new B(r(this.modules.backend), o.resourceStore, o, this.options), o.backendConnector.on("*", function (t) {
            for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), i = 1; i < n; i++) {
              r[i - 1] = arguments[i];
            }e.emit.apply(e, [t].concat(r));
          }), this.modules.languageDetector && (o.languageDetector = r(this.modules.languageDetector), o.languageDetector.init(o, this.options.detection, this.options)), this.modules.i18nFormat && (o.i18nFormat = r(this.modules.i18nFormat), o.i18nFormat.init && o.i18nFormat.init(this)), this.translator = new j(this.services, this.options), this.translator.on("*", function (t) {
            for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), i = 1; i < n; i++) {
              r[i - 1] = arguments[i];
            }e.emit.apply(e, [t].concat(r));
          }), this.modules.external.forEach(function (t) {
            t.init && t.init(e);
          });
        }if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
          var s = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);s.length > 0 && "dev" !== s[0] && (this.options.lng = s[0]);
        }this.services.languageDetector || this.options.lng || this.logger.warn("init: no languageDetector is used and no lng is defined");var a = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];a.forEach(function (t) {
          e[t] = function () {
            var n;return (n = e.store)[t].apply(n, arguments);
          };
        });var l = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];l.forEach(function (t) {
          e[t] = function () {
            var n;return (n = e.store)[t].apply(n, arguments), e;
          };
        });var u = T(),
            d = function d() {
          var t = function t(_t5, r) {
            e.isInitialized && e.logger.warn("init: i18next is already initialized. You should call init just once!"), e.isInitialized = !0, e.options.isClone || e.logger.log("initialized", e.options), e.emit("initialized", e.options), u.resolve(r), n(_t5, r);
          };if (e.languages && "v1" !== e.options.compatibilityAPI && !e.isInitialized) return t(null, e.t.bind(e));e.changeLanguage(e.options.lng, t);
        };return this.options.resources || !this.options.initImmediate ? d() : setTimeout(d, 0), u;
      } }, { key: "loadResources", value: function value(e) {
        var t = this,
            n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : K,
            r = n,
            i = "string" == typeof e ? e : this.language;if ("function" == typeof e && (r = e), !this.options.resources || this.options.partialBundledLanguages) {
          if (i && "cimode" === i.toLowerCase()) return r();var o = [],
              s = function s(e) {
            e && t.services.languageUtils.toResolveHierarchy(e).forEach(function (e) {
              o.indexOf(e) < 0 && o.push(e);
            });
          };if (i) s(i);else {
            var a = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);a.forEach(function (e) {
              return s(e);
            });
          }this.options.preload && this.options.preload.forEach(function (e) {
            return s(e);
          }), this.services.backendConnector.load(o, this.options.ns, r);
        } else r(null);
      } }, { key: "reloadResources", value: function value(e, t, n) {
        var r = T();return e || (e = this.languages), t || (t = this.options.ns), n || (n = K), this.services.backendConnector.reload(e, t, function (e) {
          r.resolve(), n(e);
        }), r;
      } }, { key: "use", value: function value(e) {
        if (!e) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");if (!e.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");return "backend" === e.type && (this.modules.backend = e), ("logger" === e.type || e.log && e.warn && e.error) && (this.modules.logger = e), "languageDetector" === e.type && (this.modules.languageDetector = e), "i18nFormat" === e.type && (this.modules.i18nFormat = e), "postProcessor" === e.type && P.addPostProcessor(e), "3rdParty" === e.type && this.modules.external.push(e), this;
      } }, { key: "changeLanguage", value: function value(e, t) {
        var n = this;this.isLanguageChangingTo = e;var r = T();this.emit("languageChanging", e);var i = function i(e) {
          var i = "string" == typeof e ? e : n.services.languageUtils.getBestMatchFromCodes(e);i && (n.language || (n.language = i, n.languages = n.services.languageUtils.toResolveHierarchy(i)), n.translator.language || n.translator.changeLanguage(i), n.services.languageDetector && n.services.languageDetector.cacheUserLanguage(i)), n.loadResources(i, function (e) {
            !function (e, i) {
              i ? (n.language = i, n.languages = n.services.languageUtils.toResolveHierarchy(i), n.translator.changeLanguage(i), n.isLanguageChangingTo = void 0, n.emit("languageChanged", i), n.logger.log("languageChanged", i)) : n.isLanguageChangingTo = void 0, r.resolve(function () {
                return n.t.apply(n, arguments);
              }), t && t(e, function () {
                return n.t.apply(n, arguments);
              });
            }(e, i);
          });
        };return e || !this.services.languageDetector || this.services.languageDetector.async ? !e && this.services.languageDetector && this.services.languageDetector.async ? this.services.languageDetector.detect(i) : i(e) : i(this.services.languageDetector.detect()), r;
      } }, { key: "getFixedT", value: function value(e, t) {
        var n = this,
            r = function e(t, r) {
          var i;if ("object" !== l(r)) {
            for (var o = arguments.length, s = new Array(o > 2 ? o - 2 : 0), a = 2; a < o; a++) {
              s[a - 2] = arguments[a];
            }i = n.options.overloadTranslationOptionHandler([t, r].concat(s));
          } else i = c({}, r);return i.lng = i.lng || e.lng, i.lngs = i.lngs || e.lngs, i.ns = i.ns || e.ns, n.t(t, i);
        };return "string" == typeof e ? r.lng = e : r.lngs = e, r.ns = t, r;
      } }, { key: "t", value: function value() {
        var e;return this.translator && (e = this.translator).translate.apply(e, arguments);
      } }, { key: "exists", value: function value() {
        var e;return this.translator && (e = this.translator).exists.apply(e, arguments);
      } }, { key: "setDefaultNamespace", value: function value(e) {
        this.options.defaultNS = e;
      } }, { key: "hasLoadedNamespace", value: function value(e) {
        var t = this,
            n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};if (!this.isInitialized) return this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages), !1;if (!this.languages || !this.languages.length) return this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages), !1;var r = this.languages[0],
            i = !!this.options && this.options.fallbackLng,
            o = this.languages[this.languages.length - 1];if ("cimode" === r.toLowerCase()) return !0;var s = function s(e, n) {
          var r = t.services.backendConnector.state["".concat(e, "|").concat(n)];return -1 === r || 2 === r;
        };if (n.precheck) {
          var a = n.precheck(this, s);if (void 0 !== a) return a;
        }return !!this.hasResourceBundle(r, e) || !this.services.backendConnector.backend || !(!s(r, e) || i && !s(o, e));
      } }, { key: "loadNamespaces", value: function value(e, t) {
        var n = this,
            r = T();return this.options.ns ? ("string" == typeof e && (e = [e]), e.forEach(function (e) {
          n.options.ns.indexOf(e) < 0 && n.options.ns.push(e);
        }), this.loadResources(function (e) {
          r.resolve(), t && t(e);
        }), r) : (t && t(), Promise.resolve());
      } }, { key: "loadLanguages", value: function value(e, t) {
        var n = T();"string" == typeof e && (e = [e]);var r = this.options.preload || [],
            i = e.filter(function (e) {
          return r.indexOf(e) < 0;
        });return i.length ? (this.options.preload = r.concat(i), this.loadResources(function (e) {
          n.resolve(), t && t(e);
        }), n) : (t && t(), Promise.resolve());
      } }, { key: "dir", value: function value(e) {
        return e || (e = this.languages && this.languages.length > 0 ? this.languages[0] : this.language), e ? ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam"].indexOf(this.services.languageUtils.getLanguagePartFromCode(e)) >= 0 ? "rtl" : "ltr" : "rtl";
      } }, { key: "createInstance", value: function value() {
        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            n = arguments.length > 1 ? arguments[1] : void 0;return new t(e, n);
      } }, { key: "cloneInstance", value: function value() {
        var e = this,
            n = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
            r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : K,
            i = c({}, this.options, n, { isClone: !0 }),
            o = new t(i),
            s = ["store", "services", "language"];return s.forEach(function (t) {
          o[t] = e[t];
        }), o.services = c({}, this.services), o.services.utils = { hasLoadedNamespace: o.hasLoadedNamespace.bind(o) }, o.translator = new j(o.services, o.options), o.translator.on("*", function (e) {
          for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++) {
            n[r - 1] = arguments[r];
          }o.emit.apply(o, [e].concat(n));
        }), o.init(i, r), o.translator.options = o.options, o.translator.backendConnector.services.utils = { hasLoadedNamespace: o.hasLoadedNamespace.bind(o) }, o;
      } }]), t;
  }(C))(),
      Q = n(22),
      $ = n.n(Q),
      Z = n(14),
      X = function () {
    function X() {
      (0, _classCallCheck3.default)(this, X);
    }

    (0, _createClass3.default)(X, null, [{
      key: "uuid",
      value: function uuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (e) {
          var t = 16 * Math.random() | 0;return ("x" == e ? t : 3 & t | 8).toString(16);
        });
      }
    }, {
      key: "assign",
      value: function assign() {
        return Object(Z.assign).apply(undefined, arguments);
      }
    }, {
      key: "merge",
      value: function merge() {
        return Object(Z.merge).apply(undefined, arguments);
      }
    }, {
      key: "randomElementId",
      value: function randomElementId() {
        return "lwp" + Math.random().toString(36).substr(2, 9);
      }
    }, {
      key: "mediaElementEvents",
      value: function mediaElementEvents() {
        return ["abort", "canplay", "canplaythrough", "durationchange", "emptied", "ended", "error", "loadeddata", "loadedmetadata", "loadstart", "pause", "play", "playing", "ratechange", "seeked", "seeking", "stalled", "suspend", "timeupdate", "volumechange", "waiting"];
      }
    }, {
      key: "trackParameters",
      value: function trackParameters(e, t) {
        if (e && t) return "function" != typeof t.getCapabilities && (t.getCapabilities = function () {}), { trackKind: t.kind, selected: "live" == t.readyState, deviceKind: this.trackKindtoDeviceKind(t.kind), settings: t.getSettings(), constraints: t.getConstraints(), capabilities: t.getCapabilities(), track: t, mediaStream: e };
      }
    }, {
      key: "trackKindtoDeviceKind",
      value: function trackKindtoDeviceKind(e) {
        switch (e) {case "audio":
            return "audioinput";case "video":
            return "videoinput";}
      }
    }, {
      key: "trackKinds",
      value: function trackKinds() {
        return ["audio", "video"];
      }
    }, {
      key: "isChrome",
      value: function isChrome() {
        var e = window.chrome,
            t = window.navigator,
            n = t.vendor,
            r = void 0 !== window.opr,
            i = t.userAgent.indexOf("Edge") > -1;return t.userAgent.match("CriOS") || null != e && "Google Inc." === n && !1 === r && !1 === i;
      }
    }]);
    return X;
  }(),
      ee = n(11),
      te = n(23),
      ne = n.n(te),
      re = function () {
    function re(e) {
      var _this = this;

      (0, _classCallCheck3.default)(this, re);
      this._renders = [], this._windowLoaded = !1, this._i18nReady = !1, this._renderReady = !1, e.on("language.changed", function () {
        _this._i18nReady = !0, _this._windowLoaded && _this._i18nReady && (_this._renderReady = !0, _this.render(), _this._emit("render.ready", _this));
      }), window.addEventListener("load", function () {
        _this._windowLoaded = !0, _this._windowLoaded && _this._i18nReady && (_this._renderReady = !0, _this.render(), _this._emit("render.ready", _this));
      });
    }

    (0, _createClass3.default)(re, [{
      key: "renderAddTarget",
      value: function renderAddTarget(e) {
        "string" == typeof e && (e = { root: { elementId: e } });var t = X.merge(this._renderDefaultConfig(), { data: e.data || {}, i18n: e.i18n || {}, template: e.template, root: e.root || {}, by_id: e.by_id || {}, by_name: e.by_name || {}, enabled: !0 });t.by_id && Object.keys(t.by_id).forEach(function (e) {
          var n = t.by_id[e];n.elementId || (n.elementId = X.randomElementId());
        }), t.by_name && Object.keys(t.by_name).forEach(function (e) {
          var n = t.by_name[e];n.elementName || (n.elementName = X.randomElementId());
        }), this._emit("render.new", this, t), this._renderReady && this._render(t), this._renders.push(t);
      }
    }, {
      key: "render",
      value: function render() {
        var _this2 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function (e) {
          return e;
        };
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (e) {
          return e;
        };
        var n = this._renders.map(function (n) {
          return _this2._render(e(n)).then(function (e) {
            return t(e);
          });
        });return Promise.all(n).then(function (e) {
          return _this2._emit("render.rendered", _this2, e), e;
        });
      }
    }, {
      key: "_render",
      value: function _render(e) {
        var _this3 = this;

        return new Promise(function (t) {
          if (_this3._renderReady) {
            var _n11 = { data: e.data, by_id: e.by_id, by_name: e.by_name, i18n: _this3._i18nTranslate(e.i18n) };e.html = ne.a.render(e.template, _n11), !e.root.element && e.root.elementId && (e.root.element = document.getElementById(e.root.elementId)), e.root.element && e.enabled && (e.root.element.innerHTML = e.html), e.by_id && Object.keys(e.by_id).forEach(function (t) {
              var n = e.by_id[t];n.elementId && (n.element = document.getElementById(n.elementId)), n.element && n.events && Object.keys(n.events).forEach(function (t) {
                n.element[t] = function () {
                  for (var _len2 = arguments.length, r = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    r[_key2] = arguments[_key2];
                  }

                  r.push(e), n.events[t].apply(_this3, r);
                };
              });
            }), e.by_name && Object.keys(e.by_name).forEach(function (t) {
              var n = e.by_name[t];n.elementName && (n.elements = document.getElementsByName(n.elementName)), n.elements && n.events && n.elements.forEach(function (t) {
                Object.keys(n.events).forEach(function (r) {
                  t[r] = function () {
                    for (var _len3 = arguments.length, t = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                      t[_key3] = arguments[_key3];
                    }

                    t.push(e), n.events[r].apply(_this3, t);
                  };
                });
              });
            }), t(e);
          } else t(e);
        });
      }
    }, {
      key: "_i18nTranslate",
      value: function _i18nTranslate(e) {
        var t = this._libwebphone.i18nTranslator(),
            n = {};var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = Object.entries(e)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _ref = _step.value;

            var _ref2 = (0, _slicedToArray3.default)(_ref, 2);

            var _r4 = _ref2[0];
            var _i4 = _ref2[1];
            n[_r4] = t(_i4);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return n;
      }
    }]);
    return re;
  }(),
      ie = n(24),
      oe = n.n(ie),
      se = function () {
    function se(e) {
      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      (0, _classCallCheck3.default)(this, se);
      this._libwebphone = e, this._id = t && t.data.lwpStreamId || X.uuid(), this._emit = this._libwebphone._callEvent, this._session = t, this._initProperties(), this._initEventBindings(), this._libwebphone.getCallList() || this._setPrimary(), this._emit("created", this), t && this._timeUpdate();
    }

    (0, _createClass3.default)(se, [{
      key: "getId",
      value: function getId() {
        return this._id;
      }
    }, {
      key: "hasSession",
      value: function hasSession() {
        return null != this._session;
      }
    }, {
      key: "hasPeerConnection",
      value: function hasPeerConnection() {
        var e = this._getSession();return e && e.connection;
      }
    }, {
      key: "getPeerConnection",
      value: function getPeerConnection() {
        if (this.hasPeerConnection()) return this._getSession().connection;
      }
    }, {
      key: "isPrimary",
      value: function isPrimary() {
        return this._primary;
      }
    }, {
      key: "getRemoteAudio",
      value: function getRemoteAudio() {
        return this._streams.remote.elements.audio;
      }
    }, {
      key: "getRemoteVideo",
      value: function getRemoteVideo() {
        return this._streams.remote.elements.video;
      }
    }, {
      key: "getLocalAudio",
      value: function getLocalAudio() {
        return this._streams.local.elements.audio;
      }
    }, {
      key: "getLocalVideo",
      value: function getLocalVideo() {
        return this._streams.local.elements.video;
      }
    }, {
      key: "isInProgress",
      value: function isInProgress() {
        return !!this.hasSession() && this._getSession().isInProgress();
      }
    }, {
      key: "isEstablished",
      value: function isEstablished() {
        return !!this.hasSession() && this._getSession().isEstablished();
      }
    }, {
      key: "isEnded",
      value: function isEnded() {
        return !!this.hasSession() && this._getSession().isEnded();
      }
    }, {
      key: "isRinging",
      value: function isRinging() {
        return "terminating" == this.getDirection() && !this.isEstablished();
      }
    }, {
      key: "isInTransfer",
      value: function isInTransfer() {
        return this._inTransfer;
      }
    }, {
      key: "getDirection",
      value: function getDirection() {
        return this.hasSession() && "incoming" == this._getSession().direction ? "terminating" : "originating";
      }
    }, {
      key: "localIdentity",
      value: function localIdentity() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
        var t = this._getSession();if (t) {
          if (e) return t.local_identity;var _n12 = t.local_identity.display_name,
              _r5 = t.local_identity.uri.user;return _n12 && _n12 != _r5 ? _n12 + " (" + _r5 + ")" : _r5;
        }
      }
    }, {
      key: "remoteIdentity",
      value: function remoteIdentity() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
        var t = this._getSession();if (t) {
          if (e) return t.remote_identity;var _n13 = t.remote_identity.display_name,
              _r6 = t.remote_identity.uri.user;return _n13 && _n13 != _r6 ? _n13 + " (" + _r6 + ")" : _r6;
        }
      }
    }, {
      key: "terminate",
      value: function terminate() {
        this.hasSession() && (this.isEstablished() ? this.hangup() : this.cancel());
      }
    }, {
      key: "cancel",
      value: function cancel() {
        this.hasSession() && this._getSession().terminate();
      }
    }, {
      key: "hangup",
      value: function hangup() {
        this.hasSession() && this._getSession().terminate();
      }
    }, {
      key: "hold",
      value: function hold() {
        this.hasSession() && this._getSession().hold();
      }
    }, {
      key: "isOnHold",
      value: function isOnHold() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
        var t = { local: !1, remote: !1 };return this.hasSession() && (t = this._getSession().isOnHold()), e ? t : t.local || t.remote;
      }
    }, {
      key: "unhold",
      value: function unhold() {
        this.hasSession() && (this._getSession().unhold(), this._updateStreams());
      }
    }, {
      key: "mute",
      value: function mute() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        e = X.merge(e, { audio: !0, video: !0 }), this.hasSession() && this._getSession().mute(e);
      }
    }, {
      key: "unmute",
      value: function unmute() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        e = X.merge(e, { audio: !0, video: !0 }), this.hasSession() && this._getSession().unmute(e);
      }
    }, {
      key: "isMuted",
      value: function isMuted() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
        var t = { audio: !1, video: !1 };return this.hasSession() && (t = this._getSession().isMuted()), e ? t : t.audio || t.video;
      }
    }, {
      key: "transfer",
      value: function transfer() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
        if (this.hasSession()) if (this.isInTransfer() || e) {
          var _n14 = this._libwebphone.getDialpad();this._inTransfer = !1, !e && _n14 && (e = _n14.getTarget(!0)), e ? (this._getSession().refer(e), this._emit("transfer.started", this, e)) : (t && this.unhold(), this._emit("transfer.failed", this, e)), this._emit("transfer.complete", this, e);
        } else this._inTransfer = !0, t && this.hold(), this._emit("transfer.collecting", this);
      }
    }, {
      key: "answer",
      value: function answer() {
        var _this4 = this;

        if (this.hasSession()) {
          var e = this._libwebphone.getMediaDevices();e ? e.startStreams(this.getId()).then(function (e) {
            var t = { mediaStream: e };_this4._getSession().answer(t), _this4._emit("answered", _this4);
          }) : (this._getSession().answer({}), this._emit("answered", this));
        }
      }
    }, {
      key: "reject",
      value: function reject() {
        this.hasSession() && (this._getSession().terminate(), this._emit("rejected", this));
      }
    }, {
      key: "renegotiate",
      value: function renegotiate() {
        this.hasSession() && !this.isOnHold() && (this._getSession().renegotiate(), this._updateStreams(), this._emit("renegotiated", this));
      }
    }, {
      key: "sendDTMF",
      value: function sendDTMF(e) {
        this.hasSession() && (this._getSession().sendDTMF(e), this._emit("send.dtmf", this, e));
      }
    }, {
      key: "changeVolume",
      value: function changeVolume() {
        var _this5 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        if (null === e && this._libwebphone.getAudioContext() && (e = this._libwebphone.getAudioContext().getVolume("remote", { scale: !1, relativeToMaster: !0 })), e || 0 === e) if (e < 0 && (e = 0), e > 1 && (e = 1), t) {
          var _n15 = this._streams.remote.elements[t];_n15 && (_n15.volume = e);
        } else Object.keys(this._streams.remote.elements).forEach(function (t) {
          var n = _this5._streams.remote.elements[t];n && (n.volume = e);
        });
      }
    }, {
      key: "replaceSenderTrack",
      value: function replaceSenderTrack(e) {
        var _this6 = this;

        var t = this.getPeerConnection();if (!t) return;if ("closed" == t.signalingState || "closed" == t.connectionState) return;var n = t.getSenders().find(function (t) {
          var n = t.track;if (n) return n.kind == e.kind;
        });n ? n.replaceTrack(e).then(function () {
          _this6.renegotiate();
        }) : (t.addTrack(e), this.renegotiate());
      }
    }, {
      key: "removeSenderTrack",
      value: function removeSenderTrack(e) {
        var t = this.getPeerConnection();if (!t) return;if ("closed" == t.signalingState || "closed" == t.connectionState) return;var n = t.getSenders().find(function (t) {
          var n = t.track;if (n) return n.kind == e;
        });n && (t.removeTrack(n), this.renegotiate());
      }
    }, {
      key: "summary",
      value: function summary() {
        var e = this.getDirection();return { callId: this.getId(), hasSession: this.hasSession(), progress: this.isInProgress(), established: this.isEstablished(), ended: this.isEnded(), held: this.isOnHold(), muted: this.isMuted(), primary: this.isPrimary(), inTransfer: this.isInTransfer(), direction: e, terminating: "terminating" == e, originating: "originating" == e, localIdentity: this.localIdentity(), remoteIdentity: this.remoteIdentity() };
      }
    }, {
      key: "getCustomHeaders",
      value: function getCustomHeaders() {
        var e = this._getSession()._request;if (e && e.headers) return Object.keys(e.headers).reduce(function (t, n) {
          if (n.startsWith("X-")) {
            var _r7 = e.headers[n];_r7 && Array.isArray(_r7) && (t[n] = _r7.map(function (e) {
              return e.raw;
            }).toString());
          }return t;
        }, {});
      }
    }, {
      key: "_initProperties",
      value: function _initProperties() {
        var _this7 = this;

        this._primary = !1, this._inTransfer = !1, this._muteHint = !1, this._config = this._libwebphone._config.call, this._streams = { remote: { mediaStream: new MediaStream(), kinds: { audio: !1, video: !1 }, elements: { audio: document.createElement("audio"), video: document.createElement("video") } }, local: { mediaStream: new MediaStream(), kinds: { audio: !1, video: !1 }, elements: { audio: document.createElement("audio"), video: document.createElement("video") } } }, Object.keys(this._streams).forEach(function (e) {
          Object.keys(_this7._streams[e].elements).forEach(function (t) {
            var n = _this7._streams[e].elements[t];X.mediaElementEvents().forEach(function (r) {
              n.addEventListener(r, function (i) {
                _this7._emit(e + "." + t + "." + r, _this7, n, i);
              });
            }), _this7._config.useAudioContext ? n.muted = !0 : n.muted = !("remote" == e && "audio" == t), n.preload = "none", _this7._emit(e + "." + t + ".element", _this7, n);
          });
        }), this.isRinging() && this._emit("ringing.started", this);
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this8 = this;

        if (this._libwebphone.on("mediaDevices.audio.input.changed", function (e, t, n) {
          _this8.hasSession() && (n ? _this8.replaceSenderTrack(n.track) : _this8.removeSenderTrack("audio"));
        }), this._libwebphone.on("mediaDevices.video.input.changed", function (e, t, n) {
          _this8.hasSession() && (n ? _this8.replaceSenderTrack(n.track) : _this8.removeSenderTrack("video"));
        }), this._libwebphone.on("mediaDevices.audio.output.changed", function (e, t, n) {
          Object.keys(_this8._streams.remote.elements).forEach(function (e) {
            var t = _this8._streams.remote.elements[e];t && t.setSinkId(n.id);
          });
        }), this._libwebphone.on("audioContext.channel.master.volume", function () {
          _this8.changeVolume();
        }), this._libwebphone.on("audioContext.channel.remote.volume", function () {
          _this8.changeVolume();
        }), this.hasPeerConnection()) {
          var e = this.getPeerConnection();this._emit("peerconnection", this, e), e.addEventListener("track", function () {
            for (var _len4 = arguments.length, e = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
              e[_key4] = arguments[_key4];
            }

            _this8._emit.apply(_this8, ["peerconnection.add.track", _this8].concat(e)), _this8._updateStreams();
          }), e.addEventListener("removestream", function () {
            for (var _len5 = arguments.length, e = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
              e[_key5] = arguments[_key5];
            }

            _this8._emit.apply(_this8, ["peerconnection.remove.track", _this8].concat(e)), _this8._updateStreams();
          });
        }this.hasSession() && (this._getSession().on("progress", function () {
          for (var _len6 = arguments.length, e = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
            e[_key6] = arguments[_key6];
          }

          _this8._emit.apply(_this8, ["progress", _this8].concat(e));
        }), this._getSession().on("confirmed", function () {
          for (var _len7 = arguments.length, e = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
            e[_key7] = arguments[_key7];
          }

          _this8._answerTime = new Date(), _this8._emit("ringing.stopped", _this8), _this8._emit.apply(_this8, ["established", _this8].concat(e));
        }), this._getSession().on("newDTMF", function () {
          for (var _len8 = arguments.length, e = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
            e[_key8] = arguments[_key8];
          }

          _this8._emit.apply(_this8, ["receive.dtmf", _this8].concat(e));
        }), this._getSession().on("newInfo", function () {
          for (var _len9 = arguments.length, e = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
            e[_key9] = arguments[_key9];
          }

          _this8._emit.apply(_this8, ["receive.info", _this8].concat(e));
        }), this._getSession().on("hold", function () {
          for (var _len10 = arguments.length, e = Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
            e[_key10] = arguments[_key10];
          }

          _this8._emit.apply(_this8, ["hold", _this8].concat(e));
        }), this._getSession().on("unhold", function () {
          for (var _len11 = arguments.length, e = Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
            e[_key11] = arguments[_key11];
          }

          _this8._emit.apply(_this8, ["unhold", _this8].concat(e));
        }), this._getSession().on("muted", function () {
          for (var _len12 = arguments.length, e = Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
            e[_key12] = arguments[_key12];
          }

          _this8._emit.apply(_this8, ["muted", _this8].concat(e));
        }), this._getSession().on("unmuted", function () {
          for (var _len13 = arguments.length, e = Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
            e[_key13] = arguments[_key13];
          }

          _this8._emit.apply(_this8, ["unmuted", _this8].concat(e));
        }), this._getSession().on("ended", function () {
          for (var _len14 = arguments.length, e = Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
            e[_key14] = arguments[_key14];
          }

          _this8._destroyCall(), _this8._emit.apply(_this8, ["ended", _this8].concat(e));
        }), this._getSession().on("failed", function () {
          for (var _len15 = arguments.length, e = Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
            e[_key15] = arguments[_key15];
          }

          _this8._destroyCall(), _this8._emit.apply(_this8, ["failed", _this8].concat(e));
        }), this._getSession().on("peerconnection", function () {
          for (var _len16 = arguments.length, e = Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
            e[_key16] = arguments[_key16];
          }

          var t = e[0].peerconnection;_this8._emit("peerconnection", _this8, t), t.addEventListener("track", function () {
            for (var _len17 = arguments.length, e = Array(_len17), _key17 = 0; _key17 < _len17; _key17++) {
              e[_key17] = arguments[_key17];
            }

            _this8._emit.apply(_this8, ["peerconnection.add.track", _this8].concat(e)), _this8._updateStreams();
          }), t.addEventListener("remotestream", function () {
            for (var _len18 = arguments.length, e = Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
              e[_key18] = arguments[_key18];
            }

            _this8._emit.apply(_this8, ["peerconnection.remove.track", _this8].concat(e)), _this8._updateStreams();
          });
        }), this._config.globalKeyShortcuts && (document.addEventListener("keydown", function (e) {
          if (e.target == document.body && !e.repeat && _this8.isPrimary()) switch (e.key) {case " ":
              _this8._config.keys.spacebar.enabled && _this8._config.keys.spacebar.action(e, _this8);}
        }), document.addEventListener("keyup", function (e) {
          if (e.target == document.body && !e.repeat && _this8.isPrimary()) switch (e.key) {case " ":
              _this8._config.keys.spacebar.enabled && _this8._config.keys.spacebar.action(e, _this8);}
        })));
      }
    }, {
      key: "_timeUpdate",
      value: function _timeUpdate() {
        var _this9 = this;

        if (this._answerTime) {
          var e = new Date() - this._answerTime,
              t = { secondsDecimalDigits: 0 };this._emit("timeupdate", this, this._answerTime, e, oe()(1e3 * Math.ceil(e / 1e3), t));
        }this.hasSession() && setTimeout(function () {
          _this9._timeUpdate();
        }, 100);
      }
    }, {
      key: "_destroyCall",
      value: function _destroyCall() {
        this._emit("terminated", this), this.isPrimary() && this._clearPrimary(!1), this._destroyStreams(), this._session = null;
      }
    }, {
      key: "_getSession",
      value: function _getSession() {
        return this._session;
      }
    }, {
      key: "_setPrimary",
      value: function _setPrimary() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
        this.isPrimary() || (e && this.isEstablished() && this.isOnHold() && this.unhold(), this._emit("promoted", this), this._primary = !0, this._connectStreams());
      }
    }, {
      key: "_clearPrimary",
      value: function _clearPrimary() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
        this.isPrimary() && (this.isInTransfer() && (this._inTransfer = !1, this._emit("transfer.failed", this)), this._primary = !1, e && this.isEstablished() && !this.isOnHold() && this.hold(), this._disconnectStreams(), this._emit("demoted", this));
      }
    }, {
      key: "_updateStreams",
      value: function _updateStreams() {
        var _this10 = this;

        Object.keys(this._streams).forEach(function (e) {
          var t = _this10.getPeerConnection(),
              n = _this10._streams[e].mediaStream;if (t) {
            var _r8 = [];switch (e) {case "remote":
                t.getReceivers().forEach(function (e) {
                  e.track && _r8.push(e.track);
                });break;case "local":
                t.getSenders().forEach(function (e) {
                  e.track && _r8.push(e.track);
                });}_this10._syncTracks(n, _r8, e);
          }Object.keys(_this10._streams[e].elements).forEach(function (t) {
            var r = _this10._streams[e].elements[t];r && (n.getTracks().find(function (e) {
              return e.kind == t;
            }) ? (_this10._streams[e].kinds[t] = !0, r.srcObject && r.srcObject.id == n.id || (r.srcObject = n)) : (_this10._streams[e].kinds[t] = !1, r.srcObject = null));
          });
        });
      }
    }, {
      key: "_syncTracks",
      value: function _syncTracks(e, t, n) {
        var _this11 = this;

        var r = t.map(function (e) {
          return e.id;
        }),
            i = e.getTracks().map(function (e) {
          return e.id;
        }),
            o = r.filter(function (e) {
          return !i.includes(e);
        }),
            s = i.filter(function (e) {
          return !r.includes(e);
        });e.getTracks().forEach(function (t) {
          s.includes(t.id) && (e.removeTrack(t), _this11._emit(n + "." + t.kind + ".removed", _this11, X.trackParameters(e, t)));
        }), t.forEach(function (t) {
          o.includes(t.id) && (e.addTrack(t), _this11._emit(n + "." + t.kind + ".added", _this11, X.trackParameters(e, t)));
        });
      }
    }, {
      key: "_connectStreams",
      value: function _connectStreams() {
        var _this12 = this;

        if (Object.keys(this._streams).forEach(function (e) {
          var t = _this12._streams[e].mediaStream;_this12._emit(e + ".mediaStream.connect", _this12, t);
        }), !this.hasSession()) return;var e = this.getPeerConnection();e && e.getSenders().forEach(function (e) {
          e.track && (e.track.enabled = !0);
        }), Object.keys(this._streams).forEach(function (e) {
          Object.keys(_this12._streams[e].elements).forEach(function (t) {
            var n = _this12._streams[e].elements[t];n && n.paused && n.play().catch(function () {}), _this12._emit(e + "." + t + ".connect", _this12, n);
          });
        });
      }
    }, {
      key: "_disconnectStreams",
      value: function _disconnectStreams() {
        var _this13 = this;

        if (Object.keys(this._streams).forEach(function (e) {
          var t = _this13._streams[e].mediaStream;_this13._emit(e + ".mediaStream.disconnect", _this13, t);
        }), !this.hasSession()) return;var e = this.getPeerConnection();e && e.getSenders().forEach(function (e) {
          e.track && (e.track.enabled = !1);
        }), Object.keys(this._streams).forEach(function (e) {
          Object.keys(_this13._streams[e].elements).forEach(function (t) {
            var n = _this13._streams[e].elements[t];n && !n.paused && n.pause(), _this13._emit(e + "." + t + ".disconnect", _this13, n);
          });
        });
      }
    }, {
      key: "_destroyStreams",
      value: function _destroyStreams() {
        this._emit("ringing.stopped", this);var e = this.getPeerConnection();e && e.getSenders().forEach(function (e) {
          e.track && e.track.stop();
        });
      }
    }]);
    return se;
  }(),
      ae = function (_re) {
    (0, _inherits3.default)(ae, _re);

    function ae(e) {
      var _this14, _ret;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, ae);
      return _ret = ((_this14 = (0, _possibleConstructorReturn3.default)(this, (ae.__proto__ || Object.getPrototypeOf(ae)).call(this, e)), _this14), _this14._libwebphone = e, _this14._emit = _this14._libwebphone._userAgentEvent, _this14._initProperties(t), _this14._initInternationalization(t.i18n || {}), _this14._initSockets(), _this14._initEventBindings(), _this14._initRenderTargets(), _this14._emit("created", _this14), _this14.initAgent = _this14._initAgent.bind(_this14), _this14), (0, _possibleConstructorReturn3.default)(_this14, _ret);
    }

    (0, _createClass3.default)(ae, [{
      key: "start",
      value: function start() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        var _this15 = this;

        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        if (!this.isStarted()) {
          e && (this._config.authentication.username = e), t && (this._config.authentication.password = t), n && (this._config.authentication.realm = n);try {
            var _e19 = { sockets: this._sockets, uri: "webphone@" + this._config.authentication.realm, connection_recovery_max_interval: this._config.transport.recovery_max_interval, connection_recovery_min_interval: this._config.transport.recovery_min_interval, contact_uri: this._config.user_agent.contact_uri, display_name: this._config.user_agent.display_name, instance_id: this._config.user_agent.instance_id, no_answer_timeout: this._config.user_agent.no_answer_timeout, realm: this._config.authentication.realm, register: this._config.user_agent.register, register_expires: this._config.user_agent.register_expires, user_agent: this._config.user_agent.user_agent, session_timers: !1 };return this._config.authentication.jwt && (_e19.authorization_jwt = this._config.authentication.jwt), this._config.authentication.username && (_e19.authorization_user = this._config.authentication.username, _e19.uri = this._config.authentication.username + "@" + this._config.authentication.realm, this._config.authentication.password && (_e19.password = this._config.authentication.password)), this.initAgent(_e19), this._userAgent.start(), this._userAgent.on("connected", function () {
              for (var _len19 = arguments.length, e = Array(_len19), _key19 = 0; _key19 < _len19; _key19++) {
                e[_key19] = arguments[_key19];
              }

              _this15.updateRenders(), _this15._emit.apply(_this15, ["connected", _this15].concat(e));
            }), this._userAgent.on("disconnected", function () {
              for (var _len20 = arguments.length, e = Array(_len20), _key20 = 0; _key20 < _len20; _key20++) {
                e[_key20] = arguments[_key20];
              }

              _this15.updateRenders(), _this15._emit.apply(_this15, ["disconnected", _this15].concat(e));
            }), this._userAgent.on("registered", function () {
              for (var _len21 = arguments.length, e = Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
                e[_key21] = arguments[_key21];
              }

              _this15.updateRenders(), _this15._emit.apply(_this15, ["registration.registered", _this15].concat(e));
            }), this._userAgent.on("unregistered", function () {
              for (var _len22 = arguments.length, e = Array(_len22), _key22 = 0; _key22 < _len22; _key22++) {
                e[_key22] = arguments[_key22];
              }

              _this15.updateRenders(), _this15._emit.apply(_this15, ["registration.unregistered", _this15].concat(e));
            }), this._userAgent.on("registrationFailed", function () {
              for (var _len23 = arguments.length, e = Array(_len23), _key23 = 0; _key23 < _len23; _key23++) {
                e[_key23] = arguments[_key23];
              }

              _this15.updateRenders(), _this15._emit.apply(_this15, ["registration.failed", _this15].concat(e));
            }), this._userAgent.on("registrationExpiring", function () {
              for (var _len24 = arguments.length, e = Array(_len24), _key24 = 0; _key24 < _len24; _key24++) {
                e[_key24] = arguments[_key24];
              }

              _this15._emit.apply(_this15, ["registration.expiring", _this15].concat(e)), _this15._userAgent.register();
            }), this._userAgent.on("newRTCSession", function () {
              for (var _len25 = arguments.length, e = Array(_len25), _key25 = 0; _key25 < _len25; _key25++) {
                e[_key25] = arguments[_key25];
              }

              var t = e[0].session;new se(_this15._libwebphone, t);
            }), this._userAgent.on("newMessage", function () {
              for (var _len26 = arguments.length, e = Array(_len26), _key26 = 0; _key26 < _len26; _key26++) {
                e[_key26] = arguments[_key26];
              }

              _this15._emit.apply(_this15, ["recieved.message", _this15].concat(e));
            }), this._userAgent.on("sipEvent", function () {
              for (var _len27 = arguments.length, e = Array(_len27), _key27 = 0; _key27 < _len27; _key27++) {
                e[_key27] = arguments[_key27];
              }

              _this15._emit.apply(_this15, ["recieved.notify", _this15].concat(e));
            }), this._emit("started", this), this._userAgent;
          } catch (e) {
            this._emit("configuration.error", this, e);
          }
        }
      }
    }, {
      key: "stop",
      value: function stop() {
        this.isStarted() && (this.hangupAll(), this.unregister(), this._userAgent.stop(), this._userAgent = null, this._emit("stopped", this));
      }
    }, {
      key: "isStarted",
      value: function isStarted() {
        return null != this._userAgent;
      }
    }, {
      key: "isConnected",
      value: function isConnected() {
        return !!this.isStarted() && this._userAgent.isConnected();
      }
    }, {
      key: "startDebug",
      value: function startDebug() {
        this._debug = !0, ee.debug.enable("JsSIP:*"), this._emit("debug.start", this);
      }
    }, {
      key: "stopDebug",
      value: function stopDebug() {
        this._debug = !1, ee.debug.enable(""), this._emit("debug.stop", this);
      }
    }, {
      key: "toggleDebug",
      value: function toggleDebug() {
        return this.isDebugging() ? this.stopDebug() : this.startDebug();
      }
    }, {
      key: "isDebugging",
      value: function isDebugging() {
        return this._debug;
      }
    }, {
      key: "register",
      value: function register() {
        this.isStarted() && this._userAgent.register();
      }
    }, {
      key: "unregister",
      value: function unregister() {
        this.isStarted() && this._userAgent.unregister({ all: !0 });
      }
    }, {
      key: "toggleRegistration",
      value: function toggleRegistration() {
        this.isRegistered() ? this.unregister() : this.register();
      }
    }, {
      key: "isRegistered",
      value: function isRegistered() {
        return !!this.isStarted() && this._userAgent.isRegistered();
      }
    }, {
      key: "redial",
      value: function redial() {
        var e = this.getRedial();return this._emit("redial.started", this, e), this.call(e);
      }
    }, {
      key: "getRedial",
      value: function getRedial() {
        return this._redialTarget;
      }
    }, {
      key: "setRedial",
      value: function setRedial(e) {
        this._redialTarget != e && (this._redialTarget = e, this._emit("redial.update", this, this._redialTarget));
      }
    }, {
      key: "call",
      value: function call() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        var _this16 = this;

        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !1;
        var r = { data: { lwpStreamId: X.uuid() }, extraHeaders: [].concat((0, _toConsumableArray3.default)(t), (0, _toConsumableArray3.default)(this._config.custom_headers.establish_call)), anonymous: n };var i = this._libwebphone.getMediaDevices(),
            o = this._libwebphone.getCallList();e ? this.setRedial(e) : e = this.getRedial(), o || this.hangupAll(), i ? i.startStreams(r.data.lwpStreamId).then(function (t) {
          r = X.merge(r, { mediaStream: t }), _this16._call(e, r);
        }).catch(function (e) {
          _this16._emit("call.failed", _this16, e);
        }) : this._call(e, r);
      }
    }, {
      key: "hangupAll",
      value: function hangupAll() {
        this.isStarted() && this._userAgent.terminateSessions();
      }
    }, {
      key: "isReady",
      value: function isReady() {
        return this.isStarted() && this.isConnected() && this.isRegistered();
      }
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this17 = this;

        this.render(function (e) {
          return e.data = _this17._renderData(e.data), e;
        });
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { agentstart: "Start", agentstop: "Stop", debug: "Debug", debugstart: "Start", debugstop: "Stop", username: "Username", password: "Password", realm: "Realm", registrar: "Registrar", register: "Register", unregister: "Unregister" } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("userAgent", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        this._config = X.merge({ transport: { sockets: [], recovery_max_interval: 30, recovery_min_interval: 2 }, authentication: { username: "", password: "", realm: "" }, user_agent: { no_answer_timeout: 60, register: !0, register_expires: 300, user_agent: "2600Hz libwebphone 2.x", redial: "*97" }, custom_headers: { establish_call: [] }, debug: !1 }, e), this._sockets = [], this._userAgent = null, this.setRedial(this._config.user_agent.redial), this._config.debug ? this.startDebug() : this.stopDebug();
      }
    }, {
      key: "_initSockets",
      value: function _initSockets() {
        var _this18 = this;

        this._config.transport.sockets.forEach(function (e) {
          _this18._sockets.push(new ee.WebSocketInterface(e));
        });
      }
    }, {
      key: "_initAgent",
      value: function _initAgent(e) {
        var _this19 = this;

        this._userAgent = new ee.UA(e), this._userAgent.receiveRequest = function (e) {
          var t = _this19._userAgent._configuration.uri.user,
              n = e.ruri.user;return t && n && t.toLowerCase() == n.toLowerCase() && (e.ruri.user = t), _this19._userAgent.__proto__.receiveRequest.call(_this19._userAgent, e);
        }, this._config.custom_headers.register && (this._userAgent.registrator().setExtraHeaders(this._config.custom_headers.register), console.log(this._userAgent));
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this20 = this;

        this._libwebphone.on("userAgent.debug.start", function () {
          _this20.updateRenders();
        }), this._libwebphone.on("userAgent.debug.stop", function () {
          _this20.updateRenders();
        }), this._libwebphone.on("userAgent.call.failed", function () {
          _this20.updateRenders();
        }), this._libwebphone.onAny(function (e) {
          for (var _len28 = arguments.length, t = Array(_len28 > 1 ? _len28 - 1 : 0), _key28 = 1; _key28 < _len28; _key28++) {
            t[_key28 - 1] = arguments[_key28];
          }

          _this20.isDebugging() && console.log(e, t);
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this21 = this;

        this._config.renderTargets.map(function (e) {
          return _this21.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this22 = this;

        return { template: this._renderDefaultTemplate(), i18n: { agentstart: "libwebphone:userAgent.agentstart", agentstop: "libwebphone:userAgent.agentstop", debug: "libwebphone:userAgent.debug", debugstart: "libwebphone:userAgent.debugstart", debugstop: "libwebphone:userAgent.debugstop", registrar: "libwebphone:userAgent.registrar", register: "libwebphone:userAgent.register", unregister: "libwebphone:userAgent.unregister", username: "libwebphone:userAgent.username", password: "libwebphone:userAgent.password", realm: "libwebphone:userAgent.realm" }, data: X.merge({}, this._config, this._renderData()), by_id: { debug: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this22.toggleDebug();
                } } }, registrar: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this22.toggleRegistration();
                } } }, username: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this22._config.authentication.username = t.value;
                } } }, password: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this22._config.authentication.password = t.value;
                } } }, realm: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this22._config.authentication.realm = t.value;
                } } }, agentstart: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this22.start();
                } } }, agentstop: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this22.stop();
                } } } } };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n    <div>\n      <div>\n        <label for="{{by_id.debug.elementId}}">\n          {{i18n.debug}}\n        </label>\n        <button id="{{by_id.debug.elementId}}">\n          {{^data.isDebugging}}\n            {{i18n.debugstart}}\n          {{/data.isDebugging}}\n\n          {{#data.isDebugging}}\n            {{i18n.debugstop}}\n          {{/data.isDebugging}}\n        </button>\n      </div>\n\n      {{^data.isStarted}}\n        <div>\n          <label for="{{by_id.username.elementId}}">\n            {{i18n.username}}\n          </label>\n          <input type="text" id="{{by_id.username.elementId}}" value="{{data.authentication.username}}" />\n        </div>\n\n        <div>\n          <label for="{{by_id.password.elementId}}">\n            {{i18n.password}}\n          </label>\n          <input type="text" id="{{by_id.password.elementId}}" value="{{data.authentication.password}}" />\n        </div>\n        \n        <div>\n          <label for="{{by_id.realm.elementId}}">\n            {{i18n.realm}}\n          </label>\n          <input type="text" id="{{by_id.realm.elementId}}" value="{{data.authentication.realm}}" />\n        </div>\n\n        <div>\n          <label for="{{by_id.agentstart.elementId}}">\n            {{i18n.agent}}\n          </label>\n          <button id="{{by_id.agentstart.elementId}}">{{i18n.agentstart}}</button>\n        </div>\n      {{/data.isStarted}}\n\n      {{#data.isStarted}}\n        <div>\n          <label for="{{by_id.registrar.elementId}}">\n            {{i18n.registrar}}\n          </label>\n          <button id="{{by_id.registrar.elementId}}">\n            {{^data.isRegistered}}\n              {{i18n.register}}\n            {{/data.isRegistered}}\n\n            {{#data.isRegistered}}\n              {{i18n.unregister}}\n            {{/data.isRegistered}}\n          </button>\n        </div>\n\n        <label for="{{by_id.agentstop.elementId}}">\n          {{i18n.agent}}\n        </label>\n        <button id="{{by_id.agentstop.elementId}}">{{i18n.agentstop}}</button>\n      {{/data.isStarted}}\n    </div>\n      ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        return e.isStarted = this.isStarted(), e.isConnected = this.isConnected(), e.isRegistered = this.isRegistered(), e.isReady = this.isReady(), e.isDebugging = this.isDebugging(), e;
      }
    }, {
      key: "_call",
      value: function _call(e, t) {
        try {
          if (!this.isReady()) throw new Error("Webphone client not ready yet!");this._userAgent.call(e, t), this._emit("call.started", this, e);
        } catch (e) {
          this._emit("call.failed", this, e);
        }
      }
    }]);
    return ae;
  }(re),
      le = function (_re2) {
    (0, _inherits3.default)(le, _re2);

    function le(e) {
      var _this23, _ret2;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, le);
      return _ret2 = ((_this23 = (0, _possibleConstructorReturn3.default)(this, (le.__proto__ || Object.getPrototypeOf(le)).call(this, e)), _this23), _this23._libwebphone = e, _this23._emit = _this23._libwebphone._callListEvent, _this23._initProperties(t), _this23._initInternationalization(t.i18n || {}), _this23._initEventBindings(), _this23._initRenderTargets(), _this23._emit("created", _this23), _this23), (0, _possibleConstructorReturn3.default)(_this23, _ret2);
    }

    (0, _createClass3.default)(le, [{
      key: "getCalls",
      value: function getCalls() {
        return this._calls;
      }
    }, {
      key: "getCall",
      value: function getCall() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        return this._calls.find(function (t) {
          return e ? t.getId() == e : t.isPrimary() && t.hasSession();
        });
      }
    }, {
      key: "addCall",
      value: function addCall(e) {
        var t = this.getCall();t && !t.isOnHold() ? (this._calls.push(e), this._emit("calls.added", this, e)) : (this._calls.map(function (e) {
          e.isPrimary && e._clearPrimary();
        }), this._calls.push(e), this._emit("calls.added", this, e), e._setPrimary(), this._emit("calls.changed", this, e, t));
      }
    }, {
      key: "switchCall",
      value: function switchCall(e) {
        var t = this.getCall(),
            n = this.getCall(e);this._calls.map(function (e) {
          e.isPrimary && e._clearPrimary();
        }), n && (n._setPrimary(), n.hasSession() ? this._emit("calls.changed", this, n, t) : this._emit("calls.changed", this, null, t));
      }
    }, {
      key: "removeCall",
      value: function removeCall(e) {
        var t = e.getId();if (this._calls = this._calls.filter(function (e) {
          return e.getId() != t;
        }), this._emit("calls.removed", this, e), e.isPrimary()) {
          var _t6 = this._calls.find(function (e) {
            return e.hasSession();
          });_t6 ? (_t6._setPrimary(!1), this._emit("calls.changed", this, _t6, e)) : this._calls.length > 0 && (this._calls[0]._setPrimary(), this._emit("calls.changed", this, null, e)), e._clearPrimary(!1);
        }
      }
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this24 = this;

        this.render(function (e) {
          return e.data = _this24._renderData(e.data), e;
        });
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { new: "New Call" } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("callList", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        this._config = X.merge({ renderTargets: [] }, e);var t = new se(this._libwebphone);t._setPrimary(), this._calls = [t];
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this25 = this;

        this._libwebphone.on("call.created", function (e, t) {
          _this25.addCall(t);
        }), this._libwebphone.on("call.terminated", function (e, t) {
          _this25.removeCall(t);
        }), this._libwebphone.on("calllist.calls.added", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("callList.calls.changed", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.promoted", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.progress", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.established", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.hold", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.unhold", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.muted", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.unmuted", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.transfer.collecting", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.transfer.completed", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.ended", function () {
          _this25.updateRenders();
        }), this._libwebphone.on("call.failed", function () {
          _this25.updateRenders();
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this26 = this;

        this._config.renderTargets.map(function (e) {
          return _this26.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this27 = this;

        return { template: this._renderDefaultTemplate(), i18n: { new: "libwebphone:callList.new" }, data: X.merge({}, this._config, this._renderData()), by_name: { calls: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.value;_this27.switchCall(t);
                } } } } };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n      {{#data.calls}}\n\n      {{^hasSession}}\n        {{#primary}}\n          <input type="radio" id="{{by_name.calls.elementName}}{{callId}}" name="{{by_name.calls.elementName}}" value="{{callId}}" checked="checked">\n          <label for="{{by_name.calls.elementName}}{{callId}}">{{i18n.new}}</label>\n        {{/primary}}\n\n        {{^primary}}\n          <input type="radio" id="{{by_name.calls.elementName}}{{callId}}" name="{{by_name.calls.elementName}}" value="{{callId}}">\n          <label for="{{by_name.calls.elementName}}{{callId}}">{{i18n.new}}</label>\n        {{/primary}}\n      {{/hasSession}}\n\n      {{#hasSession}}\n        {{#primary}}\n        <input type="radio" id="{{by_name.calls.elementName}}{{callId}}"  name="{{by_name.calls.elementName}}" value="{{callId}}" checked="checked">\n        {{/primary}}\n\n        {{^primary}}\n        <input type="radio" id="{{by_name.calls.elementName}}{{callId}}"  name="{{by_name.calls.elementName}}" value="{{callId}}">\n        {{/primary}}\n\n        <label for="{{by_name.calls.elementName}}{{callId}}">{{remoteIdentity}}\n          <ul>\n            <li>call id: {{callId}}</li>\n            <li>primary: {{primary}}</li>\n            <li>progress: {{progress}}</li>\n            <li>established: {{established}}</li>\n            <li>held: {{held}}</li>\n            <li>muted: {{muted}}</li>\n            <li>inTransfer: {{inTransfer}}</li>\n            <li>ended: {{ended}}</li>\n            <li>direction: {{direction}}</li>\n          </ul>\n        </label>\n      {{/hasSession}}\n      {{/data.calls}}\n\n\n    ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        return e.calls = this.getCalls().map(function (e) {
          return e.summary();
        }), e.primary = this.getCall(), e;
      }
    }]);
    return le;
  }(re),
      ue = function (_re3) {
    (0, _inherits3.default)(ue, _re3);

    function ue(e) {
      var _this28, _ret3;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, ue);
      return _ret3 = ((_this28 = (0, _possibleConstructorReturn3.default)(this, (ue.__proto__ || Object.getPrototypeOf(ue)).call(this, e)), _this28), _this28._libwebphone = e, _this28._emit = _this28._libwebphone._callControlEvent, _this28._initProperties(t), _this28._initInternationalization(t.i18n || {}), _this28._initEventBindings(), _this28._initRenderTargets(), _this28._emit("created", _this28), _this28), (0, _possibleConstructorReturn3.default)(_this28, _ret3);
    }

    (0, _createClass3.default)(ue, [{
      key: "redial",
      value: function redial() {
        var e = this._libwebphone.getUserAgent();e && e.redial();
      }
    }, {
      key: "cancel",
      value: function cancel() {
        var e = this._getCall();e && e.cancel();
      }
    }, {
      key: "hangup",
      value: function hangup() {
        var e = this._getCall();e && e.hangup();
      }
    }, {
      key: "hold",
      value: function hold() {
        var e = this._getCall();e && e.hold();
      }
    }, {
      key: "unhold",
      value: function unhold() {
        var e = this._getCall();e && e.unhold();
      }
    }, {
      key: "mute",
      value: function mute() {
        var e = this._getCall();e && e.mute();
      }
    }, {
      key: "unmute",
      value: function unmute() {
        var e = this._getCall();e && e.unmute();
      }
    }, {
      key: "transfer",
      value: function transfer() {
        var e = this._getCall();e && e.transfer();
      }
    }, {
      key: "answer",
      value: function answer() {
        var e = this._getCall();e && e.answer();
      }
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this29 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = null;var n = this._libwebphone.getCallList();this._call = !e && n ? n.getCall() : e, this._call && (t = this._call.summary()), this.render(function (e) {
          return e.data = _this29._renderData(e.data, t), e;
        });
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { answer: "Anwser", redial: "Redial", cancel: "Cancel", hangup: "Hang Up", hold: "Hold", unhold: "Resume", mute: "Mute", unmute: "Unmute", transferblind: "Blind Transfer", transferattended: "Attended Transfer", transfercomplete: "Transfer (complete)" } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("callControl", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        this._config = X.merge({ renderTargets: [] }, e);
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this30 = this;

        this._libwebphone.on("call.promoted", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.progress", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.established", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.hold", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.unhold", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.muted", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.unmuted", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.transfer.collecting", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.transfer.completed", function (e, t) {
          _this30.updateRenders(t);
        }), this._libwebphone.on("call.primary.terminated", function () {
          _this30.updateRenders();
        }), this._libwebphone.on("userAgent.call.failed", function () {
          _this30.updateRenders();
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this31 = this;

        this._config.renderTargets.map(function (e) {
          return _this31.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this32 = this;

        return { template: this._renderDefaultTemplate(), i18n: { answer: "libwebphone:callControl.answer", redial: "libwebphone:callControl.redial", cancel: "libwebphone:callControl.cancel", hangup: "libwebphone:callControl.hangup", hold: "libwebphone:callControl.hold", unhold: "libwebphone:callControl.unhold", mute: "libwebphone:callControl.mute", unmute: "libwebphone:callControl.unmute", transfercomplete: "libwebphone:callControl.transfercomplete", transferblind: "libwebphone:callControl.transferblind", transferattended: "libwebphone:callControl.transferattended" }, data: X.merge({}, this._config, this._renderData()), by_id: { redial: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.redial();
                } } }, cancel: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.cancel();
                } } }, hangup: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.hangup();
                } } }, hold: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.hold();
                } } }, unhold: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.unhold();
                } } }, mute: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.mute();
                } } }, unmute: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.unmute();
                } } }, transfer: { events: { onclick: function onclick() {
                  _this32.transfer();
                } } }, answer: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this32.answer();
                } } } } };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n    <div>\n      {{^data.call.hasSession}}\n      {{#data.redial}}\n        <button id="{{by_id.redial.elementId}}">\n          {{i18n.redial}} ({{data.redial}})\n        </button>\n      {{/data.redial}}\n      {{/data.call.hasSession}}\n\n      {{#data.call.hasSession}}\n        {{#data.call.progress}}\n          <button id="{{by_id.cancel.elementId}}">\n            {{i18n.cancel}}\n          </button>\n        {{/data.call.progress}}   \n\n        {{#data.call.established}}\n          <button id="{{by_id.hangup.elementId}}">\n            {{i18n.hangup}}\n          </button>\n\n          {{^data.call.held}}\n            <button id="{{by_id.hold.elementId}}">\n              {{i18n.hold}}\n            </button>\n          {{/data.call.held}}\n\n          {{#data.call.held}}\n            <button id="{{by_id.unhold.elementId}}">\n              {{i18n.unhold}}\n            </button>\n          {{/data.call.held}}\n\n          {{^data.call.muted}}\n            <button id="{{by_id.mute.elementId}}">\n              {{i18n.mute}}\n            </button>\n          {{/data.call.muted}}\n\n          {{#data.call.muted}}\n            <button id="{{by_id.unmute.elementId}}">\n              {{i18n.unmute}}\n            </button>\n          {{/data.call.muted}}\n\n          <button id="{{by_id.transfer.elementId}}">\n            {{^data.call.inTransfer}}\n              {{i18n.transferblind}}\n            {{/data.call.inTransfer}}\n\n            {{#data.call.inTransfer}}\n              {{i18n.transfercomplete}}\n            {{/data.call.inTransfer}}\n          </button>\n        {{/data.call.established}}\n\n        {{#data.call.terminating}}\n        {{#data.call.progress}}\n          <button id="{{by_id.answer.elementId}}">\n            {{i18n.answer}}\n          </button>\n        {{/data.call.progress}}\n        {{/data.call.terminating}}\n      {{/data.call.hasSession}}\n    </div>\n    ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var n = this._libwebphone.getUserAgent();return e.redial = n ? n.getRedial() : null, e.call = t, e;
      }
    }, {
      key: "_getCall",
      value: function _getCall() {
        return this._call;
      }
    }]);
    return ue;
  }(re),
      ce = function (_re4) {
    (0, _inherits3.default)(ce, _re4);

    function ce(e) {
      var _this33, _ret4;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, ce);
      return _ret4 = ((_this33 = (0, _possibleConstructorReturn3.default)(this, (ce.__proto__ || Object.getPrototypeOf(ce)).call(this, e)), _this33), _this33._libwebphone = e, _this33._emit = _this33._libwebphone._dialpadEvent, _this33._initProperties(t), _this33._initInternationalization(t.i18n || {}), _this33._initEventBindings(), _this33._initRenderTargets(), _this33._emit("created", _this33), _this33), (0, _possibleConstructorReturn3.default)(_this33, _ret4);
    }

    (0, _createClass3.default)(ce, [{
      key: "dial",
      value: function dial(e) {
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
        var n = this._getCall();"string" == typeof e || e instanceof String || (e = e.toString()), !0 === t && (t = this._charToTone(e)), !1 !== t && this._emit("tones.play", this, t), n && !n.isInTransfer() ? n.sendDTMF(e) : this._target.push(e), this._emit("target.updated", this, this.getTarget(), e);
      }
    }, {
      key: "backspace",
      value: function backspace() {
        this._target.pop(), this._emit("target.backspace", this, this.getTarget());
      }
    }, {
      key: "clear",
      value: function clear() {
        this._target = [], this._emit("target.clear", this, this.getTarget());
      }
    }, {
      key: "enableFilter",
      value: function enableFilter() {
        this._config.dialed.filter.enabled || (this._config.dialed.filter.enabled = !0, this._emit("filter.enabled", this));
      }
    }, {
      key: "disableFilter",
      value: function disableFilter() {
        this._config.dialed.filter.enabled && (this._config.dialed.filter.enabled = !1, this._emit("filter.disabled", this));
      }
    }, {
      key: "toggleFilter",
      value: function toggleFilter() {
        this._config.dialed.filter.enabled ? this.disableFilter() : this.enableFilter();
      }
    }, {
      key: "enableConvertion",
      value: function enableConvertion() {
        this._config.dialed.convert.enabled || (this._config.dialed.convert.enabled = !0, this._emit("convert.enabled", this));
      }
    }, {
      key: "disableConvertion",
      value: function disableConvertion() {
        this._config.dialed.convert.enabled && (this._config.dialed.convert.enabled = !1, this._emit("convert.disabled", this));
      }
    }, {
      key: "toggleConvertion",
      value: function toggleConvertion() {
        this._config.dialed.convert.enabled ? this.disableConvertion() : this.enableConvertion();
      }
    }, {
      key: "getTarget",
      value: function getTarget() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !0;
        var n = this._target;var r = this._config.dialed;return r.convert.enabled && (n = n.map(function (e) {
          switch (e = e.toLowerCase(), !0) {case /[abc]/.test(e):
              return "1";case /[def]/.test(e):
              return "2";case /[ghi]/.test(e):
              return "4";case /[jkl]/.test(e):
              return "5";case /[mno]/.test(e):
              return "6";case /[pqrs]/.test(e):
              return "7";case /[tuv]/.test(e):
              return "8";case /[wxyz]/.test(e):
              return "9";default:
              return e;}
        })), r.filter.enabled && (n = n.filter(function (e) {
          return (/[0-9*#]/.test(e)
          );
        })), e && this.clear(), t && (n = n.join("")), n;
      }
    }, {
      key: "hasTarget",
      value: function hasTarget() {
        return this.getTarget(!1, !1).length > 0;
      }
    }, {
      key: "answer",
      value: function answer() {
        var e = this._getCall();e && e.answer();
      }
    }, {
      key: "call",
      value: function call() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !0;
        var t = this.getTarget(!0, !1);var n = this._libwebphone.getUserAgent();n && (t = e && !t.length ? n.getRedial() : t.join(""), n.call(t), this._emit("call", this, t));
      }
    }, {
      key: "redial",
      value: function redial() {
        var e = this._libwebphone.getUserAgent();e && (e.call(), this._emit("redial", this));
      }
    }, {
      key: "transfer",
      value: function transfer() {
        var e = this._getCall();e && (e.transfer(this.getTarget()), this.clear());
      }
    }, {
      key: "terminate",
      value: function terminate() {
        var e = this._getCall();e && e.terminate();
      }
    }, {
      key: "autoAction",
      value: function autoAction(e) {
        switch (e = X.merge({ answer: !0, redial: !0, call: !0, transfer: !0, terminate: !0 }, e), this.getAutoAction()) {case "answer":
            e.answer && this.answer();break;case "redial":
            e.redial && this.redial();break;case "call":
            e.call && this.call();break;case "transfer":
            e.call && this.transfer();break;case "terminate":
            e.call && this.terminate();}
      }
    }, {
      key: "getAutoAction",
      value: function getAutoAction() {
        var e = this._getCall();return e ? e.isInTransfer() ? "transfer" : "terminating" != e.getDirection() || e.isEstablished() ? "terminate" : "answer" : this.hasTarget() ? "call" : "redial";
      }
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this34 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function (e) {
          return e;
        };
        this.render(function (e) {
          return e.data = _this34._renderData(e.data), e;
        }, e);
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", astrisk: "*", zero: "0", pound: "#", clear: "clear", backspace: "<-", call: "Call", transfer: "Transfer", enableconvert: "A -> #", disableconvert: "A -> A", enablefilter: "# Only", disablefilter: "Any" } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("dialpad", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        var _this35 = this;

        var t = { renderTargets: [], dialed: { show: !0, backspace: { show: !0 }, clear: { show: !0 }, filter: { show: !0, enabled: !0 }, convert: { show: !0, enabled: !1 } }, controls: { show: !0, call: { show: !0 }, transfer: { show: !0 } }, dialpad: { show: !0 }, tones: { one: [1209, 697], two: [1336, 697], three: [1477, 697], four: [1209, 770], five: [1336, 770], six: [1477, 697], seven: [1209, 852], eight: [1336, 852], nine: [1477, 852], astrisk: [1209, 941], zero: [1336, 941], pound: [1477, 941] }, globalKeyShortcuts: !0, keys: { enter: { enabled: !0, action: function action() {
                _this35._libwebphone.getUserAgent() && !_this35._libwebphone.getUserAgent().isStarted() ? _this35._libwebphone.getUserAgent().start() : _this35.autoAction({ terminate: !1 });
              } }, escape: { enabled: !0, action: function action() {
                _this35._getCall() ? _this35.terminate() : _this35.clear();
              } }, backspace: { enabled: !0, action: function action() {
                _this35.backspace();
              } }, dtmf: { enabled: !0, action: function action(e) {
                _this35._getCall() && !/^[0-9#*]$/.test(e.key) || _this35.dial(e.key);
              } } } };this._config = X.merge(t, e), this._target = [];
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this36 = this;

        this._libwebphone.on("call.primary.transfer.collecting", function () {
          _this36.clear();
        }), this._libwebphone.on("call.primary.transfer.complete", function () {
          _this36.clear();
        }), this._libwebphone.on("callList.calls.changed", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.target.updated", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.target.backspace", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.target.clear", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.convert.enabled", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.convert.disabled", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.filter.enabled", function () {
          _this36.updateRenders();
        }), this._libwebphone.on("dialpad.filter.disabled", function () {
          _this36.updateRenders();
        }), this._config.globalKeyShortcuts && document.addEventListener("keydown", function (e) {
          var t = e.key;if (e.target == document.body) switch (t) {case "Enter":
              _this36._config.keys.enter.enabled && _this36._config.keys.enter.action(e, _this36);break;case "Escape":
              _this36._config.keys.escape.enabled && _this36._config.keys.escape.action(e, _this36);break;case "Backspace":
              _this36._config.keys.backspace.enabled && _this36._config.keys.backspace.action(e, _this36);break;default:
              1 == t.length && _this36._config.keys.dtmf.enabled && _this36._config.keys.dtmf.action(e, _this36);}
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this37 = this;

        this._config.renderTargets.map(function (e) {
          return _this37.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this38 = this;

        return { template: this._renderDefaultTemplate(), i18n: { one: "libwebphone:dialpad.one", two: "libwebphone:dialpad.two", three: "libwebphone:dialpad.three", four: "libwebphone:dialpad.four", five: "libwebphone:dialpad.five", six: "libwebphone:dialpad.six", seven: "libwebphone:dialpad.seven", eight: "libwebphone:dialpad.eight", nine: "libwebphone:dialpad.nine", astrisk: "libwebphone:dialpad.astrisk", zero: "libwebphone:dialpad.zero", pound: "libwebphone:dialpad.pound", clear: "libwebphone:dialpad.clear", backspace: "libwebphone:dialpad.backspace", call: "libwebphone:dialpad.call", transfer: "libwebphone:dialpad.transfer", enableconvert: "libwebphone:dialpad.enableconvert", disableconvert: "libwebphone:dialpad.disableconvert", enablefilter: "libwebphone:dialpad.enablefilter", disablefilter: "libwebphone:dialpad.disablefilter" }, data: X.merge({}, this._config, this._renderData()), by_id: { dialed: { events: { oninput: function oninput(e) {
                  _this38._syncElementValue(e);
                }, onkeypress: function onkeypress(e) {
                  13 == e.keyCode && _this38.autoAction({ terminate: !1 });
                } } }, one: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, two: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, three: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, four: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, five: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, six: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, seven: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, eight: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, nine: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, astrisk: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, zero: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, pound: { events: { onclick: function onclick(e) {
                  var t = e.srcElement.dataset.value;_this38.dial(_this38._valueToChar(t), _this38._valueToTone(t));
                } } }, clear: { events: { onclick: function onclick() {
                  _this38.clear();
                } } }, convert: { events: { onclick: function onclick() {
                  _this38.toggleConvertion();
                } } }, filter: { events: { onclick: function onclick() {
                  _this38.toggleFilter();
                } } }, backspace: { events: { onclick: function onclick() {
                  _this38.backspace();
                } } }, call: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this38.call();
                } } }, transfer: { events: { onclick: function onclick(e) {
                  e.srcElement.disabled = !0, _this38.transfer();
                } } } } };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n    <div>\n      {{#data.dialed.show}}\n        <div>\n          <input type="text" id="{{by_id.dialed.elementId}}" value="{{data.target}}" />\n\n          {{#data.dialed.backspace.show}}\n            <button id="{{by_id.backspace.elementId}}" {{^data.target}}disabled{{/data.target}}>{{i18n.backspace}}</button>\n          {{/data.dialed.backspace.show}}\n\n          {{#data.dialed.clear.show}}\n            <button id="{{by_id.clear.elementId}}" {{^data.target}}disabled{{/data.target}}>{{i18n.clear}}</button>\n          {{/data.dialed.clear.show}}\n\n          {{#data.dialed.convert.show}}\n            <button id="{{by_id.convert.elementId}}">\n              {{#data.convert}}{{i18n.disableconvert}}{{/data.convert}}\n              {{^data.convert}}{{i18n.enableconvert}}{{/data.convert}}\n            </button>\n          {{/data.dialed.convert.show}}\n\n          {{#data.dialed.filter.show}}\n            <button id="{{by_id.filter.elementId}}">\n              {{#data.filter}}{{i18n.disablefilter}}{{/data.filter}}\n              {{^data.filter}}{{i18n.enablefilter}}{{/data.filter}}\n            </button>\n          {{/data.dialed.filter.show}}\n\n        </div>\n      {{/data.dialed.show}}\n\n      {{#data.dialpad.show}}\n        <div>\n          <button id="{{by_id.one.elementId}}" data-value="one">{{i18n.one}}</button>\n          <button id="{{by_id.two.elementId}}" data-value="two">{{i18n.two}}</button>\n          <button id="{{by_id.three.elementId}}" data-value="three">{{i18n.three}}</button>\n        </div>\n\n        <div>\n          <button id="{{by_id.four.elementId}}" data-value="four">{{i18n.four}}</button>\n          <button id="{{by_id.five.elementId}}" data-value="five">{{i18n.five}}</button>\n          <button id="{{by_id.six.elementId}}" data-value="six">{{i18n.six}}</button>\n        </div>\n\n        <div>\n          <button id="{{by_id.seven.elementId}}" data-value="seven">{{i18n.seven}}</button>\n          <button id="{{by_id.eight.elementId}}" data-value="eight">{{i18n.eight}}</button> \n          <button id="{{by_id.nine.elementId}}" data-value="nine">{{i18n.nine}}</button>\n        </div>\n\n        <div>\n          <button id="{{by_id.astrisk.elementId}}" data-value="astrisk">{{i18n.astrisk}}</button>\n          <button id="{{by_id.zero.elementId}}" data-value="zero">{{i18n.zero}}</button>\n          <button id="{{by_id.pound.elementId}}" data-value="pound">{{i18n.pound}}</button>\n        </div>\n      {{/data.dialpad.show}}\n\n      {{#data.controls.show}}\n\n        {{#data.controls.call.show}}\n        {{^data.call}}\n          <div>\n            <button id="{{by_id.call.elementId}}" {{^data.target}}disabled{{/data.target}}>{{i18n.call}}</button>\n          </div>\n        {{/data.call}}\n        {{/data.controls.call.show}}\n\n        {{#data.controls.transfer.show}}\n        {{#data.call.inTransfer}}\n          <div>\n            <button id="{{by_id.transfer.elementId}}" {{^data.target}}disabled{{/data.target}}>{{i18n.transfer}}</button>\n          </div>\n        {{/data.call.inTransfer}}\n        {{/data.controls.transfer.show}}\n\n      {{/data.controls.show}}\n\t  </div>\n    ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var t = this._getCall();return t && (e.call = t.summary()), e.target = this.getTarget(), e.convert = this._config.dialed.convert.enabled, e.filter = this._config.dialed.filter.enabled, e;
      }
    }, {
      key: "_valueToChar",
      value: function _valueToChar(e) {
        return this._charDictionary()[e];
      }
    }, {
      key: "_valueToTone",
      value: function _valueToTone(e) {
        return this._config.tones[e];
      }
    }, {
      key: "_charToValue",
      value: function _charToValue(e) {
        var t = this._charDictionary();return Object.keys(t).reduce(function (e, n) {
          return e[t[n]] = n, e;
        }, {})[e];
      }
    }, {
      key: "_charToTone",
      value: function _charToTone(e) {
        return this._valueToTone(this._charToValue(e));
      }
    }, {
      key: "_charDictionary",
      value: function _charDictionary() {
        return { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", astrisk: "*", zero: "0", pound: "#" };
      }
    }, {
      key: "_syncElementValue",
      value: function _syncElementValue(e) {
        var _this39 = this;

        var t = e.srcElement,
            n = this._charToTone(e.data),
            r = this._getCall();n && this._emit("tones.play", this, n), r && !r.isInTransfer() ? r.sendDTMF(e.data) : this._target = t.value.split(""), this.updateRenders(function (e) {
          if (e.data = _this39._renderData(e.data), t.id == e.by_id.dialed.elementId) {
            var _n16 = t.selectionStart;e.by_id.dialed.element.focus(), e.by_id.dialed.element.setSelectionRange(_n16, _n16);
          }
        }), this._emit("target.updated", this, this.getTarget(), e.data);
      }
    }, {
      key: "_getCall",
      value: function _getCall() {
        var e = this._libwebphone.getCallList();if (e) return e.getCall();
      }
    }]);
    return ce;
  }(re),
      de = n(25);var he = !0,
      fe = !0;function pe(e, t, n) {
    var r = e.match(t);return r && r.length >= n && parseInt(r[n], 10);
  }function ge(e, t, n) {
    if (!e.RTCPeerConnection) return;var r = e.RTCPeerConnection.prototype,
        i = r.addEventListener;r.addEventListener = function (e, r) {
      if (e !== t) return i.apply(this, arguments);var o = function o(e) {
        var t = n(e);t && r(t);
      };return this._eventMap = this._eventMap || {}, this._eventMap[r] = o, i.apply(this, [e, o]);
    };var o = r.removeEventListener;r.removeEventListener = function (e, n) {
      if (e !== t || !this._eventMap || !this._eventMap[n]) return o.apply(this, arguments);var r = this._eventMap[n];return delete this._eventMap[n], o.apply(this, [e, r]);
    }, Object.defineProperty(r, "on" + t, {
      get: function get() {
        return this["_on" + t];
      },
      set: function set(e) {
        this["_on" + t] && (this.removeEventListener(t, this["_on" + t]), delete this["_on" + t]), e && this.addEventListener(t, this["_on" + t] = e);
      },
      enumerable: !0, configurable: !0 });
  }function _e(e) {
    return "boolean" != typeof e ? new Error("Argument type: " + (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) + ". Please use a boolean.") : (he = e, e ? "adapter.js logging disabled" : "adapter.js logging enabled");
  }function me(e) {
    return "boolean" != typeof e ? new Error("Argument type: " + (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) + ". Please use a boolean.") : (fe = !e, "adapter.js deprecation warnings " + (e ? "disabled" : "enabled"));
  }function ve() {
    if ("object" == (typeof window === "undefined" ? "undefined" : (0, _typeof3.default)(window))) {
      if (he) return;"undefined" != typeof console && "function" == typeof console.log && console.log.apply(console, arguments);
    }
  }function ye(e, t) {
    fe && console.warn(e + " is deprecated, please use " + t + " instead.");
  }function be(e) {
    var t = e.navigator,
        n = { browser: null, version: null };if (void 0 === e || !e.navigator) return n.browser = "Not a browser.", n;if (t.mozGetUserMedia) n.browser = "firefox", n.version = pe(t.userAgent, /Firefox\/(\d+)\./, 1);else if (t.webkitGetUserMedia || !1 === e.isSecureContext && e.webkitRTCPeerConnection && !e.RTCIceGatherer) n.browser = "chrome", n.version = pe(t.userAgent, /Chrom(e|ium)\/(\d+)\./, 2);else if (t.mediaDevices && t.userAgent.match(/Edge\/(\d+).(\d+)$/)) n.browser = "edge", n.version = pe(t.userAgent, /Edge\/(\d+).(\d+)$/, 2);else {
      if (!e.RTCPeerConnection || !t.userAgent.match(/AppleWebKit\/(\d+)\./)) return n.browser = "Not a supported browser.", n;n.browser = "safari", n.version = pe(t.userAgent, /AppleWebKit\/(\d+)\./, 1), n.supportsUnifiedPlan = e.RTCRtpTransceiver && "currentDirection" in e.RTCRtpTransceiver.prototype;
    }return n;
  }function Ce(e) {
    return "[object Object]" === Object.prototype.toString.call(e);
  }function Te(e) {
    return Ce(e) ? Object.keys(e).reduce(function (t, n) {
      var r = Ce(e[n]),
          i = r ? Te(e[n]) : e[n],
          o = r && !Object.keys(i).length;return void 0 === i || o ? t : Object.assign(t, (0, _defineProperty3.default)({}, n, i));
    }, {}) : e;
  }function we(e, t, n) {
    var r = n ? "outbound-rtp" : "inbound-rtp",
        i = new Map();if (null === t) return i;var o = [];return e.forEach(function (e) {
      "track" === e.type && e.trackIdentifier === t.id && o.push(e);
    }), o.forEach(function (t) {
      e.forEach(function (n) {
        n.type === r && n.trackId === t.id && function e(t, n, r) {
          n && !r.has(n.id) && (r.set(n.id, n), Object.keys(n).forEach(function (i) {
            i.endsWith("Id") ? e(t, t.get(n[i]), r) : i.endsWith("Ids") && n[i].forEach(function (n) {
              e(t, t.get(n), r);
            });
          }));
        }(e, n, i);
      });
    }), i;
  }var Se = ve;function Ae(e) {
    var t = e && e.navigator;if (!t.mediaDevices) return;var n = be(e),
        r = function r(e) {
      if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || e.mandatory || e.optional) return e;var t = {};return Object.keys(e).forEach(function (n) {
        if ("require" === n || "advanced" === n || "mediaSource" === n) return;var r = "object" == (0, _typeof3.default)(e[n]) ? e[n] : { ideal: e[n] };void 0 !== r.exact && "number" == typeof r.exact && (r.min = r.max = r.exact);var i = function i(e, t) {
          return e ? e + t.charAt(0).toUpperCase() + t.slice(1) : "deviceId" === t ? "sourceId" : t;
        };if (void 0 !== r.ideal) {
          t.optional = t.optional || [];var _e20 = {};"number" == typeof r.ideal ? (_e20[i("min", n)] = r.ideal, t.optional.push(_e20), _e20 = {}, _e20[i("max", n)] = r.ideal, t.optional.push(_e20)) : (_e20[i("", n)] = r.ideal, t.optional.push(_e20));
        }void 0 !== r.exact && "number" != typeof r.exact ? (t.mandatory = t.mandatory || {}, t.mandatory[i("", n)] = r.exact) : ["min", "max"].forEach(function (e) {
          void 0 !== r[e] && (t.mandatory = t.mandatory || {}, t.mandatory[i(e, n)] = r[e]);
        });
      }), e.advanced && (t.optional = (t.optional || []).concat(e.advanced)), t;
    },
        i = function i(e, _i5) {
      if (n.version >= 61) return _i5(e);if ((e = JSON.parse(JSON.stringify(e))) && "object" == (0, _typeof3.default)(e.audio)) {
        var _t7 = function _t7(e, t, n) {
          t in e && !(n in e) && (e[n] = e[t], delete e[t]);
        };_t7((e = JSON.parse(JSON.stringify(e))).audio, "autoGainControl", "googAutoGainControl"), _t7(e.audio, "noiseSuppression", "googNoiseSuppression"), e.audio = r(e.audio);
      }if (e && "object" == (0, _typeof3.default)(e.video)) {
        var _o2 = e.video.facingMode;_o2 = _o2 && ("object" == (typeof _o2 === "undefined" ? "undefined" : (0, _typeof3.default)(_o2)) ? _o2 : { ideal: _o2 });var _s2 = n.version < 66;if (_o2 && ("user" === _o2.exact || "environment" === _o2.exact || "user" === _o2.ideal || "environment" === _o2.ideal) && (!t.mediaDevices.getSupportedConstraints || !t.mediaDevices.getSupportedConstraints().facingMode || _s2)) {
          var _n17 = void 0;if (delete e.video.facingMode, "environment" === _o2.exact || "environment" === _o2.ideal ? _n17 = ["back", "rear"] : "user" !== _o2.exact && "user" !== _o2.ideal || (_n17 = ["front"]), _n17) return t.mediaDevices.enumerateDevices().then(function (t) {
            var s = (t = t.filter(function (e) {
              return "videoinput" === e.kind;
            })).find(function (e) {
              return _n17.some(function (t) {
                return e.label.toLowerCase().includes(t);
              });
            });return !s && t.length && _n17.includes("back") && (s = t[t.length - 1]), s && (e.video.deviceId = _o2.exact ? { exact: s.deviceId } : { ideal: s.deviceId }), e.video = r(e.video), Se("chrome: " + JSON.stringify(e)), _i5(e);
          });
        }e.video = r(e.video);
      }return Se("chrome: " + JSON.stringify(e)), _i5(e);
    },
        o = function o(e) {
      return n.version >= 64 ? e : { name: { PermissionDeniedError: "NotAllowedError", PermissionDismissedError: "NotAllowedError", InvalidStateError: "NotAllowedError", DevicesNotFoundError: "NotFoundError", ConstraintNotSatisfiedError: "OverconstrainedError", TrackStartError: "NotReadableError", MediaDeviceFailedDueToShutdown: "NotAllowedError", MediaDeviceKillSwitchOn: "NotAllowedError", TabCaptureError: "AbortError", ScreenCaptureError: "AbortError", DeviceCaptureError: "AbortError" }[e.name] || e.name, message: e.message, constraint: e.constraint || e.constraintName, toString: function toString() {
          return this.name + (this.message && ": ") + this.message;
        }
      };
    };if (t.getUserMedia = function (e, n, r) {
      i(e, function (e) {
        t.webkitGetUserMedia(e, n, function (e) {
          r && r(o(e));
        });
      });
    }.bind(t), t.mediaDevices.getUserMedia) {
      var _e21 = t.mediaDevices.getUserMedia.bind(t.mediaDevices);t.mediaDevices.getUserMedia = function (t) {
        return i(t, function (t) {
          return _e21(t).then(function (e) {
            if (t.audio && !e.getAudioTracks().length || t.video && !e.getVideoTracks().length) throw e.getTracks().forEach(function (e) {
              e.stop();
            }), new DOMException("", "NotFoundError");return e;
          }, function (e) {
            return Promise.reject(o(e));
          });
        });
      };
    }
  }function Ee(e, t) {
    e.navigator.mediaDevices && "getDisplayMedia" in e.navigator.mediaDevices || e.navigator.mediaDevices && ("function" == typeof t ? e.navigator.mediaDevices.getDisplayMedia = function (n) {
      return t(n).then(function (t) {
        var r = n.video && n.video.width,
            i = n.video && n.video.height,
            o = n.video && n.video.frameRate;return n.video = { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: t, maxFrameRate: o || 3 } }, r && (n.video.mandatory.maxWidth = r), i && (n.video.mandatory.maxHeight = i), e.navigator.mediaDevices.getUserMedia(n);
      });
    } : console.error("shimGetDisplayMedia: getSourceId argument is not a function"));
  }function Ie(e) {
    e.MediaStream = e.MediaStream || e.webkitMediaStream;
  }function Re(e) {
    if ("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCPeerConnection && !("ontrack" in e.RTCPeerConnection.prototype)) {
      Object.defineProperty(e.RTCPeerConnection.prototype, "ontrack", {
        get: function get() {
          return this._ontrack;
        },
        set: function set(e) {
          this._ontrack && this.removeEventListener("track", this._ontrack), this.addEventListener("track", this._ontrack = e);
        },
        enumerable: !0, configurable: !0 });var t = e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription = function () {
        var _this40 = this;

        return this._ontrackpoly || (this._ontrackpoly = function (t) {
          t.stream.addEventListener("addtrack", function (n) {
            var r = void 0;r = e.RTCPeerConnection.prototype.getReceivers ? _this40.getReceivers().find(function (e) {
              return e.track && e.track.id === n.track.id;
            }) : { track: n.track };var i = new Event("track");i.track = n.track, i.receiver = r, i.transceiver = { receiver: r }, i.streams = [t.stream], _this40.dispatchEvent(i);
          }), t.stream.getTracks().forEach(function (n) {
            var r = void 0;r = e.RTCPeerConnection.prototype.getReceivers ? _this40.getReceivers().find(function (e) {
              return e.track && e.track.id === n.id;
            }) : { track: n };var i = new Event("track");i.track = n, i.receiver = r, i.transceiver = { receiver: r }, i.streams = [t.stream], _this40.dispatchEvent(i);
          });
        }, this.addEventListener("addstream", this._ontrackpoly)), t.apply(this, arguments);
      };
    } else ge(e, "track", function (e) {
      return e.transceiver || Object.defineProperty(e, "transceiver", { value: { receiver: e.receiver } }), e;
    });
  }function ke(e) {
    if ("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCPeerConnection && !("getSenders" in e.RTCPeerConnection.prototype) && "createDTMFSender" in e.RTCPeerConnection.prototype) {
      var t = function t(e, _t8) {
        return { track: _t8, get dtmf() {
            return void 0 === this._dtmf && ("audio" === _t8.kind ? this._dtmf = e.createDTMFSender(_t8) : this._dtmf = null), this._dtmf;
          }, _pc: e };
      };if (!e.RTCPeerConnection.prototype.getSenders) {
        e.RTCPeerConnection.prototype.getSenders = function () {
          return this._senders = this._senders || [], this._senders.slice();
        };var _n18 = e.RTCPeerConnection.prototype.addTrack;e.RTCPeerConnection.prototype.addTrack = function (e, r) {
          var i = _n18.apply(this, arguments);return i || (i = t(this, e), this._senders.push(i)), i;
        };var _r10 = e.RTCPeerConnection.prototype.removeTrack;e.RTCPeerConnection.prototype.removeTrack = function (e) {
          _r10.apply(this, arguments);var t = this._senders.indexOf(e);-1 !== t && this._senders.splice(t, 1);
        };
      }var n = e.RTCPeerConnection.prototype.addStream;e.RTCPeerConnection.prototype.addStream = function (e) {
        var _this41 = this;

        this._senders = this._senders || [], n.apply(this, [e]), e.getTracks().forEach(function (e) {
          _this41._senders.push(t(_this41, e));
        });
      };var _r9 = e.RTCPeerConnection.prototype.removeStream;e.RTCPeerConnection.prototype.removeStream = function (e) {
        var _this42 = this;

        this._senders = this._senders || [], _r9.apply(this, [e]), e.getTracks().forEach(function (e) {
          var t = _this42._senders.find(function (t) {
            return t.track === e;
          });t && _this42._senders.splice(_this42._senders.indexOf(t), 1);
        });
      };
    } else if ("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCPeerConnection && "getSenders" in e.RTCPeerConnection.prototype && "createDTMFSender" in e.RTCPeerConnection.prototype && e.RTCRtpSender && !("dtmf" in e.RTCRtpSender.prototype)) {
      var _t9 = e.RTCPeerConnection.prototype.getSenders;e.RTCPeerConnection.prototype.getSenders = function () {
        var _this43 = this;

        var e = _t9.apply(this, []);return e.forEach(function (e) {
          return e._pc = _this43;
        }), e;
      }, Object.defineProperty(e.RTCRtpSender.prototype, "dtmf", {
        get: function get() {
          return void 0 === this._dtmf && ("audio" === this.track.kind ? this._dtmf = this._pc.createDTMFSender(this.track) : this._dtmf = null), this._dtmf;
        }
      });
    }
  }function xe(e) {
    if (!e.RTCPeerConnection) return;var t = e.RTCPeerConnection.prototype.getStats;e.RTCPeerConnection.prototype.getStats = function () {
      var _this44 = this;

      var _arguments = Array.prototype.slice.call(arguments),
          e = _arguments[0],
          n = _arguments[1],
          r = _arguments[2];

      if (arguments.length > 0 && "function" == typeof e) return t.apply(this, arguments);if (0 === t.length && (0 === arguments.length || "function" != typeof e)) return t.apply(this, []);var i = function i(e) {
        var t = {};return e.result().forEach(function (e) {
          var n = { id: e.id, timestamp: e.timestamp, type: { localcandidate: "local-candidate", remotecandidate: "remote-candidate" }[e.type] || e.type };e.names().forEach(function (t) {
            n[t] = e.stat(t);
          }), t[n.id] = n;
        }), t;
      },
          o = function o(e) {
        return new Map(Object.keys(e).map(function (t) {
          return [t, e[t]];
        }));
      };if (arguments.length >= 2) {
        var _r11 = function _r11(e) {
          n(o(i(e)));
        };return t.apply(this, [_r11, e]);
      }return new Promise(function (e, n) {
        t.apply(_this44, [function (t) {
          e(o(i(t)));
        }, n]);
      }).then(n, r);
    };
  }function Me(e) {
    if (!("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCPeerConnection && e.RTCRtpSender && e.RTCRtpReceiver)) return;if (!("getStats" in e.RTCRtpSender.prototype)) {
      var _t10 = e.RTCPeerConnection.prototype.getSenders;_t10 && (e.RTCPeerConnection.prototype.getSenders = function () {
        var _this45 = this;

        var e = _t10.apply(this, []);return e.forEach(function (e) {
          return e._pc = _this45;
        }), e;
      });var n = e.RTCPeerConnection.prototype.addTrack;n && (e.RTCPeerConnection.prototype.addTrack = function () {
        var e = n.apply(this, arguments);return e._pc = this, e;
      }), e.RTCRtpSender.prototype.getStats = function () {
        var e = this;return this._pc.getStats().then(function (t) {
          return we(t, e.track, !0);
        });
      };
    }if (!("getStats" in e.RTCRtpReceiver.prototype)) {
      var _t11 = e.RTCPeerConnection.prototype.getReceivers;_t11 && (e.RTCPeerConnection.prototype.getReceivers = function () {
        var _this46 = this;

        var e = _t11.apply(this, []);return e.forEach(function (e) {
          return e._pc = _this46;
        }), e;
      }), ge(e, "track", function (e) {
        return e.receiver._pc = e.srcElement, e;
      }), e.RTCRtpReceiver.prototype.getStats = function () {
        var e = this;return this._pc.getStats().then(function (t) {
          return we(t, e.track, !1);
        });
      };
    }if (!("getStats" in e.RTCRtpSender.prototype) || !("getStats" in e.RTCRtpReceiver.prototype)) return;var t = e.RTCPeerConnection.prototype.getStats;e.RTCPeerConnection.prototype.getStats = function () {
      if (arguments.length > 0 && arguments[0] instanceof e.MediaStreamTrack) {
        var _e22 = arguments[0];var _t12 = void 0,
            _n19 = void 0,
            _r12 = void 0;return this.getSenders().forEach(function (n) {
          n.track === _e22 && (_t12 ? _r12 = !0 : _t12 = n);
        }), this.getReceivers().forEach(function (t) {
          return t.track === _e22 && (_n19 ? _r12 = !0 : _n19 = t), t.track === _e22;
        }), _r12 || _t12 && _n19 ? Promise.reject(new DOMException("There are more than one sender or receiver for the track.", "InvalidAccessError")) : _t12 ? _t12.getStats() : _n19 ? _n19.getStats() : Promise.reject(new DOMException("There is no sender or receiver for the track.", "InvalidAccessError"));
      }return t.apply(this, arguments);
    };
  }function De(e) {
    e.RTCPeerConnection.prototype.getLocalStreams = function () {
      var _this47 = this;

      return this._shimmedLocalStreams = this._shimmedLocalStreams || {}, Object.keys(this._shimmedLocalStreams).map(function (e) {
        return _this47._shimmedLocalStreams[e][0];
      });
    };var t = e.RTCPeerConnection.prototype.addTrack;e.RTCPeerConnection.prototype.addTrack = function (e, n) {
      if (!n) return t.apply(this, arguments);this._shimmedLocalStreams = this._shimmedLocalStreams || {};var r = t.apply(this, arguments);return this._shimmedLocalStreams[n.id] ? -1 === this._shimmedLocalStreams[n.id].indexOf(r) && this._shimmedLocalStreams[n.id].push(r) : this._shimmedLocalStreams[n.id] = [n, r], r;
    };var n = e.RTCPeerConnection.prototype.addStream;e.RTCPeerConnection.prototype.addStream = function (e) {
      var _this48 = this;

      this._shimmedLocalStreams = this._shimmedLocalStreams || {}, e.getTracks().forEach(function (e) {
        if (_this48.getSenders().find(function (t) {
          return t.track === e;
        })) throw new DOMException("Track already exists.", "InvalidAccessError");
      });var t = this.getSenders();n.apply(this, arguments);var r = this.getSenders().filter(function (e) {
        return -1 === t.indexOf(e);
      });this._shimmedLocalStreams[e.id] = [e].concat(r);
    };var r = e.RTCPeerConnection.prototype.removeStream;e.RTCPeerConnection.prototype.removeStream = function (e) {
      return this._shimmedLocalStreams = this._shimmedLocalStreams || {}, delete this._shimmedLocalStreams[e.id], r.apply(this, arguments);
    };var i = e.RTCPeerConnection.prototype.removeTrack;e.RTCPeerConnection.prototype.removeTrack = function (e) {
      var _this49 = this;

      return this._shimmedLocalStreams = this._shimmedLocalStreams || {}, e && Object.keys(this._shimmedLocalStreams).forEach(function (t) {
        var n = _this49._shimmedLocalStreams[t].indexOf(e);-1 !== n && _this49._shimmedLocalStreams[t].splice(n, 1), 1 === _this49._shimmedLocalStreams[t].length && delete _this49._shimmedLocalStreams[t];
      }), i.apply(this, arguments);
    };
  }function Oe(e) {
    if (!e.RTCPeerConnection) return;var t = be(e);if (e.RTCPeerConnection.prototype.addTrack && t.version >= 65) return De(e);var n = e.RTCPeerConnection.prototype.getLocalStreams;e.RTCPeerConnection.prototype.getLocalStreams = function () {
      var _this50 = this;

      var e = n.apply(this);return this._reverseStreams = this._reverseStreams || {}, e.map(function (e) {
        return _this50._reverseStreams[e.id];
      });
    };var r = e.RTCPeerConnection.prototype.addStream;e.RTCPeerConnection.prototype.addStream = function (t) {
      var _this51 = this;

      if (this._streams = this._streams || {}, this._reverseStreams = this._reverseStreams || {}, t.getTracks().forEach(function (e) {
        if (_this51.getSenders().find(function (t) {
          return t.track === e;
        })) throw new DOMException("Track already exists.", "InvalidAccessError");
      }), !this._reverseStreams[t.id]) {
        var _n20 = new e.MediaStream(t.getTracks());this._streams[t.id] = _n20, this._reverseStreams[_n20.id] = t, t = _n20;
      }r.apply(this, [t]);
    };var i = e.RTCPeerConnection.prototype.removeStream;function o(e, t) {
      var n = t.sdp;return Object.keys(e._reverseStreams || []).forEach(function (t) {
        var r = e._reverseStreams[t],
            i = e._streams[r.id];n = n.replace(new RegExp(i.id, "g"), r.id);
      }), new RTCSessionDescription({ type: t.type, sdp: n });
    }function s(e, t) {
      var n = t.sdp;return Object.keys(e._reverseStreams || []).forEach(function (t) {
        var r = e._reverseStreams[t],
            i = e._streams[r.id];n = n.replace(new RegExp(r.id, "g"), i.id);
      }), new RTCSessionDescription({ type: t.type, sdp: n });
    }e.RTCPeerConnection.prototype.removeStream = function (e) {
      this._streams = this._streams || {}, this._reverseStreams = this._reverseStreams || {}, i.apply(this, [this._streams[e.id] || e]), delete this._reverseStreams[this._streams[e.id] ? this._streams[e.id].id : e.id], delete this._streams[e.id];
    }, e.RTCPeerConnection.prototype.addTrack = function (t, n) {
      var _this52 = this;

      if ("closed" === this.signalingState) throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.", "InvalidStateError");var r = [].slice.call(arguments, 1);if (1 !== r.length || !r[0].getTracks().find(function (e) {
        return e === t;
      })) throw new DOMException("The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.", "NotSupportedError");var i = this.getSenders().find(function (e) {
        return e.track === t;
      });if (i) throw new DOMException("Track already exists.", "InvalidAccessError");this._streams = this._streams || {}, this._reverseStreams = this._reverseStreams || {};var o = this._streams[n.id];if (o) o.addTrack(t), Promise.resolve().then(function () {
        _this52.dispatchEvent(new Event("negotiationneeded"));
      });else {
        var _r13 = new e.MediaStream([t]);this._streams[n.id] = _r13, this._reverseStreams[_r13.id] = n, this.addStream(_r13);
      }return this.getSenders().find(function (e) {
        return e.track === t;
      });
    }, ["createOffer", "createAnswer"].forEach(function (t) {
      var n = e.RTCPeerConnection.prototype[t],
          r = (0, _defineProperty3.default)({}, t, function () {
        var _this53 = this;

        var e = arguments;return arguments.length && "function" == typeof arguments[0] ? n.apply(this, [function (t) {
          var n = o(_this53, t);e[0].apply(null, [n]);
        }, function (t) {
          e[1] && e[1].apply(null, t);
        }, arguments[2]]) : n.apply(this, arguments).then(function (e) {
          return o(_this53, e);
        });
      });e.RTCPeerConnection.prototype[t] = r[t];
    });var a = e.RTCPeerConnection.prototype.setLocalDescription;e.RTCPeerConnection.prototype.setLocalDescription = function () {
      return arguments.length && arguments[0].type ? (arguments[0] = s(this, arguments[0]), a.apply(this, arguments)) : a.apply(this, arguments);
    };var l = Object.getOwnPropertyDescriptor(e.RTCPeerConnection.prototype, "localDescription");Object.defineProperty(e.RTCPeerConnection.prototype, "localDescription", {
      get: function get() {
        var e = l.get.apply(this);return "" === e.type ? e : o(this, e);
      }
    }), e.RTCPeerConnection.prototype.removeTrack = function (e) {
      var _this54 = this;

      if ("closed" === this.signalingState) throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.", "InvalidStateError");if (!e._pc) throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.", "TypeError");if (e._pc !== this) throw new DOMException("Sender was not created by this connection.", "InvalidAccessError");var t = void 0;this._streams = this._streams || {}, Object.keys(this._streams).forEach(function (n) {
        _this54._streams[n].getTracks().find(function (t) {
          return e.track === t;
        }) && (t = _this54._streams[n]);
      }), t && (1 === t.getTracks().length ? this.removeStream(this._reverseStreams[t.id]) : t.removeTrack(e.track), this.dispatchEvent(new Event("negotiationneeded")));
    };
  }function Le(e) {
    var t = be(e);if (!e.RTCPeerConnection && e.webkitRTCPeerConnection && (e.RTCPeerConnection = e.webkitRTCPeerConnection), !e.RTCPeerConnection) return;t.version < 53 && ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function (t) {
      var n = e.RTCPeerConnection.prototype[t],
          r = (0, _defineProperty3.default)({}, t, function () {
        return arguments[0] = new ("addIceCandidate" === t ? e.RTCIceCandidate : e.RTCSessionDescription)(arguments[0]), n.apply(this, arguments);
      });e.RTCPeerConnection.prototype[t] = r[t];
    });var n = e.RTCPeerConnection.prototype.addIceCandidate;e.RTCPeerConnection.prototype.addIceCandidate = function () {
      return arguments[0] ? t.version < 78 && arguments[0] && "" === arguments[0].candidate ? Promise.resolve() : n.apply(this, arguments) : (arguments[1] && arguments[1].apply(null), Promise.resolve());
    };
  }function Pe(e) {
    ge(e, "negotiationneeded", function (e) {
      if ("stable" === e.target.signalingState) return e;
    });
  }var Ne = n(26),
      je = n.n(Ne);function Ue(e) {
    var t = e && e.navigator,
        n = t.mediaDevices.getUserMedia.bind(t.mediaDevices);t.mediaDevices.getUserMedia = function (e) {
      return n(e).catch(function (e) {
        return Promise.reject(function (e) {
          return { name: { PermissionDeniedError: "NotAllowedError" }[e.name] || e.name, message: e.message, constraint: e.constraint, toString: function toString() {
              return this.name;
            }
          };
        }(e));
      });
    };
  }function Fe(e) {
    "getDisplayMedia" in e.navigator && e.navigator.mediaDevices && (e.navigator.mediaDevices && "getDisplayMedia" in e.navigator.mediaDevices || (e.navigator.mediaDevices.getDisplayMedia = e.navigator.getDisplayMedia.bind(e.navigator)));
  }function He(e) {
    var t = be(e);if (e.RTCIceGatherer && (e.RTCIceCandidate || (e.RTCIceCandidate = function (e) {
      return e;
    }), e.RTCSessionDescription || (e.RTCSessionDescription = function (e) {
      return e;
    }), t.version < 15025)) {
      var _t13 = Object.getOwnPropertyDescriptor(e.MediaStreamTrack.prototype, "enabled");Object.defineProperty(e.MediaStreamTrack.prototype, "enabled", {
        set: function set(e) {
          _t13.set.call(this, e);var n = new Event("enabled");n.enabled = e, this.dispatchEvent(n);
        }
      });
    }e.RTCRtpSender && !("dtmf" in e.RTCRtpSender.prototype) && Object.defineProperty(e.RTCRtpSender.prototype, "dtmf", {
      get: function get() {
        return void 0 === this._dtmf && ("audio" === this.track.kind ? this._dtmf = new e.RTCDtmfSender(this) : "video" === this.track.kind && (this._dtmf = null)), this._dtmf;
      }
    }), e.RTCDtmfSender && !e.RTCDTMFSender && (e.RTCDTMFSender = e.RTCDtmfSender);var n = je()(e, t.version);e.RTCPeerConnection = function (e) {
      return e && e.iceServers && (e.iceServers = function (e, t) {
        var n = !1;return (e = JSON.parse(JSON.stringify(e))).filter(function (e) {
          if (e && (e.urls || e.url)) {
            var t = e.urls || e.url;e.url && !e.urls && ye("RTCIceServer.url", "RTCIceServer.urls");var _r16 = "string" == typeof t;return _r16 && (t = [t]), t = t.filter(function (e) {
              if (0 === e.indexOf("stun:")) return !1;var t = e.startsWith("turn") && !e.startsWith("turn:[") && e.includes("transport=udp");return t && !n ? (n = !0, !0) : t && !n;
            }), delete e.url, e.urls = _r16 ? t[0] : t, !!t.length;
          }
        });
      }(e.iceServers, t.version), ve("ICE servers after filtering:", e.iceServers)), new n(e);
    }, e.RTCPeerConnection.prototype = n.prototype;
  }function qe(e) {
    e.RTCRtpSender && !("replaceTrack" in e.RTCRtpSender.prototype) && (e.RTCRtpSender.prototype.replaceTrack = e.RTCRtpSender.prototype.setTrack);
  }function ze(e) {
    var t = be(e),
        n = e && e.navigator,
        r = e && e.MediaStreamTrack;if (n.getUserMedia = function (e, t, r) {
      ye("navigator.getUserMedia", "navigator.mediaDevices.getUserMedia"), n.mediaDevices.getUserMedia(e).then(t, r);
    }, !(t.version > 55 && "autoGainControl" in n.mediaDevices.getSupportedConstraints())) {
      var _e23 = function _e23(e, t, n) {
        t in e && !(n in e) && (e[n] = e[t], delete e[t]);
      },
          _t14 = n.mediaDevices.getUserMedia.bind(n.mediaDevices);if (n.mediaDevices.getUserMedia = function (n) {
        return "object" == (typeof n === "undefined" ? "undefined" : (0, _typeof3.default)(n)) && "object" == (0, _typeof3.default)(n.audio) && (n = JSON.parse(JSON.stringify(n)), _e23(n.audio, "autoGainControl", "mozAutoGainControl"), _e23(n.audio, "noiseSuppression", "mozNoiseSuppression")), _t14(n);
      }, r && r.prototype.getSettings) {
        var _t15 = r.prototype.getSettings;r.prototype.getSettings = function () {
          var n = _t15.apply(this, arguments);return _e23(n, "mozAutoGainControl", "autoGainControl"), _e23(n, "mozNoiseSuppression", "noiseSuppression"), n;
        };
      }if (r && r.prototype.applyConstraints) {
        var _t16 = r.prototype.applyConstraints;r.prototype.applyConstraints = function (n) {
          return "audio" === this.kind && "object" == (typeof n === "undefined" ? "undefined" : (0, _typeof3.default)(n)) && (n = JSON.parse(JSON.stringify(n)), _e23(n, "autoGainControl", "mozAutoGainControl"), _e23(n, "noiseSuppression", "mozNoiseSuppression")), _t16.apply(this, [n]);
        };
      }
    }
  }function Ge(e, t) {
    e.navigator.mediaDevices && "getDisplayMedia" in e.navigator.mediaDevices || e.navigator.mediaDevices && (e.navigator.mediaDevices.getDisplayMedia = function (n) {
      if (!n || !n.video) {
        var _e24 = new DOMException("getDisplayMedia without video constraints is undefined");return _e24.name = "NotFoundError", _e24.code = 8, Promise.reject(_e24);
      }return !0 === n.video ? n.video = { mediaSource: t } : n.video.mediaSource = t, e.navigator.mediaDevices.getUserMedia(n);
    });
  }function Ve(e) {
    "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCTrackEvent && "receiver" in e.RTCTrackEvent.prototype && !("transceiver" in e.RTCTrackEvent.prototype) && Object.defineProperty(e.RTCTrackEvent.prototype, "transceiver", {
      get: function get() {
        return { receiver: this.receiver };
      }
    });
  }function Be(e) {
    var t = be(e);if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection && !e.mozRTCPeerConnection) return;if (!e.RTCPeerConnection && e.mozRTCPeerConnection && (e.RTCPeerConnection = e.mozRTCPeerConnection), t.version < 53 && ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function (t) {
      var n = e.RTCPeerConnection.prototype[t],
          r = (0, _defineProperty3.default)({}, t, function () {
        return arguments[0] = new ("addIceCandidate" === t ? e.RTCIceCandidate : e.RTCSessionDescription)(arguments[0]), n.apply(this, arguments);
      });e.RTCPeerConnection.prototype[t] = r[t];
    }), t.version < 68) {
      var _t17 = e.RTCPeerConnection.prototype.addIceCandidate;e.RTCPeerConnection.prototype.addIceCandidate = function () {
        return arguments[0] ? arguments[0] && "" === arguments[0].candidate ? Promise.resolve() : _t17.apply(this, arguments) : (arguments[1] && arguments[1].apply(null), Promise.resolve());
      };
    }var n = { inboundrtp: "inbound-rtp", outboundrtp: "outbound-rtp", candidatepair: "candidate-pair", localcandidate: "local-candidate", remotecandidate: "remote-candidate" },
        r = e.RTCPeerConnection.prototype.getStats;e.RTCPeerConnection.prototype.getStats = function () {
      var _arguments2 = Array.prototype.slice.call(arguments),
          e = _arguments2[0],
          i = _arguments2[1],
          o = _arguments2[2];

      return r.apply(this, [e || null]).then(function (e) {
        if (t.version < 53 && !i) try {
          e.forEach(function (e) {
            e.type = n[e.type] || e.type;
          });
        } catch (t) {
          if ("TypeError" !== t.name) throw t;e.forEach(function (t, r) {
            e.set(r, Object.assign({}, t, { type: n[t.type] || t.type }));
          });
        }return e;
      }).then(i, o);
    };
  }function We(e) {
    if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection || !e.RTCRtpSender) return;if (e.RTCRtpSender && "getStats" in e.RTCRtpSender.prototype) return;var t = e.RTCPeerConnection.prototype.getSenders;t && (e.RTCPeerConnection.prototype.getSenders = function () {
      var _this55 = this;

      var e = t.apply(this, []);return e.forEach(function (e) {
        return e._pc = _this55;
      }), e;
    });var n = e.RTCPeerConnection.prototype.addTrack;n && (e.RTCPeerConnection.prototype.addTrack = function () {
      var e = n.apply(this, arguments);return e._pc = this, e;
    }), e.RTCRtpSender.prototype.getStats = function () {
      return this.track ? this._pc.getStats(this.track) : Promise.resolve(new Map());
    };
  }function Ye(e) {
    if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection || !e.RTCRtpSender) return;if (e.RTCRtpSender && "getStats" in e.RTCRtpReceiver.prototype) return;var t = e.RTCPeerConnection.prototype.getReceivers;t && (e.RTCPeerConnection.prototype.getReceivers = function () {
      var _this56 = this;

      var e = t.apply(this, []);return e.forEach(function (e) {
        return e._pc = _this56;
      }), e;
    }), ge(e, "track", function (e) {
      return e.receiver._pc = e.srcElement, e;
    }), e.RTCRtpReceiver.prototype.getStats = function () {
      return this._pc.getStats(this.track);
    };
  }function Ke(e) {
    e.RTCPeerConnection && !("removeStream" in e.RTCPeerConnection.prototype) && (e.RTCPeerConnection.prototype.removeStream = function (e) {
      var _this57 = this;

      ye("removeStream", "removeTrack"), this.getSenders().forEach(function (t) {
        t.track && e.getTracks().includes(t.track) && _this57.removeTrack(t);
      });
    });
  }function Je(e) {
    e.DataChannel && !e.RTCDataChannel && (e.RTCDataChannel = e.DataChannel);
  }function Qe(e) {
    if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection) return;var t = e.RTCPeerConnection.prototype.addTransceiver;t && (e.RTCPeerConnection.prototype.addTransceiver = function () {
      this.setParametersPromises = [];var e = arguments[1],
          n = e && "sendEncodings" in e;n && e.sendEncodings.forEach(function (e) {
        if ("rid" in e && !/^[a-z0-9]{0,16}$/i.test(e.rid)) throw new TypeError("Invalid RID value provided.");if ("scaleResolutionDownBy" in e && !(parseFloat(e.scaleResolutionDownBy) >= 1)) throw new RangeError("scale_resolution_down_by must be >= 1.0");if ("maxFramerate" in e && !(parseFloat(e.maxFramerate) >= 0)) throw new RangeError("max_framerate must be >= 0.0");
      });var r = t.apply(this, arguments);if (n) {
        var _t18 = r.sender,
            _n21 = _t18.getParameters();"encodings" in _n21 || (_n21.encodings = e.sendEncodings, this.setParametersPromises.push(_t18.setParameters(_n21).catch(function () {})));
      }return r;
    });
  }function $e(e) {
    if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection) return;var t = e.RTCPeerConnection.prototype.createOffer;e.RTCPeerConnection.prototype.createOffer = function () {
      var _this58 = this,
          _arguments3 = arguments;

      return this.setParametersPromises && this.setParametersPromises.length ? Promise.all(this.setParametersPromises).then(function () {
        return t.apply(_this58, _arguments3);
      }).finally(function () {
        _this58.setParametersPromises = [];
      }) : t.apply(this, arguments);
    };
  }function Ze(e) {
    if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection) return;var t = e.RTCPeerConnection.prototype.createAnswer;e.RTCPeerConnection.prototype.createAnswer = function () {
      var _this59 = this,
          _arguments4 = arguments;

      return this.setParametersPromises && this.setParametersPromises.length ? Promise.all(this.setParametersPromises).then(function () {
        return t.apply(_this59, _arguments4);
      }).finally(function () {
        _this59.setParametersPromises = [];
      }) : t.apply(this, arguments);
    };
  }function Xe(e) {
    if ("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCPeerConnection) {
      if ("getLocalStreams" in e.RTCPeerConnection.prototype || (e.RTCPeerConnection.prototype.getLocalStreams = function () {
        return this._localStreams || (this._localStreams = []), this._localStreams;
      }), !("addStream" in e.RTCPeerConnection.prototype)) {
        var t = e.RTCPeerConnection.prototype.addTrack;e.RTCPeerConnection.prototype.addStream = function (e) {
          var _this60 = this;

          this._localStreams || (this._localStreams = []), this._localStreams.includes(e) || this._localStreams.push(e), e.getAudioTracks().forEach(function (n) {
            return t.call(_this60, n, e);
          }), e.getVideoTracks().forEach(function (n) {
            return t.call(_this60, n, e);
          });
        }, e.RTCPeerConnection.prototype.addTrack = function (e) {
          var n = arguments[1];return n && (this._localStreams ? this._localStreams.includes(n) || this._localStreams.push(n) : this._localStreams = [n]), t.apply(this, arguments);
        };
      }"removeStream" in e.RTCPeerConnection.prototype || (e.RTCPeerConnection.prototype.removeStream = function (e) {
        var _this61 = this;

        this._localStreams || (this._localStreams = []);var t = this._localStreams.indexOf(e);if (-1 === t) return;this._localStreams.splice(t, 1);var n = e.getTracks();this.getSenders().forEach(function (e) {
          n.includes(e.track) && _this61.removeTrack(e);
        });
      });
    }
  }function et(e) {
    if ("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCPeerConnection && ("getRemoteStreams" in e.RTCPeerConnection.prototype || (e.RTCPeerConnection.prototype.getRemoteStreams = function () {
      return this._remoteStreams ? this._remoteStreams : [];
    }), !("onaddstream" in e.RTCPeerConnection.prototype))) {
      Object.defineProperty(e.RTCPeerConnection.prototype, "onaddstream", {
        get: function get() {
          return this._onaddstream;
        },
        set: function set(e) {
          var _this62 = this;

          this._onaddstream && (this.removeEventListener("addstream", this._onaddstream), this.removeEventListener("track", this._onaddstreampoly)), this.addEventListener("addstream", this._onaddstream = e), this.addEventListener("track", this._onaddstreampoly = function (e) {
            e.streams.forEach(function (e) {
              if (_this62._remoteStreams || (_this62._remoteStreams = []), _this62._remoteStreams.includes(e)) return;_this62._remoteStreams.push(e);var t = new Event("addstream");t.stream = e, _this62.dispatchEvent(t);
            });
          });
        }
      });var t = e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription = function () {
        var e = this;return this._onaddstreampoly || this.addEventListener("track", this._onaddstreampoly = function (t) {
          t.streams.forEach(function (t) {
            if (e._remoteStreams || (e._remoteStreams = []), e._remoteStreams.indexOf(t) >= 0) return;e._remoteStreams.push(t);var n = new Event("addstream");n.stream = t, e.dispatchEvent(n);
          });
        }), t.apply(e, arguments);
      };
    }
  }function tt(e) {
    if ("object" != (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) || !e.RTCPeerConnection) return;var t = e.RTCPeerConnection.prototype,
        n = t.createOffer,
        r = t.createAnswer,
        i = t.setLocalDescription,
        o = t.setRemoteDescription,
        s = t.addIceCandidate;t.createOffer = function (e, t) {
      var r = arguments.length >= 2 ? arguments[2] : arguments[0],
          i = n.apply(this, [r]);return t ? (i.then(e, t), Promise.resolve()) : i;
    }, t.createAnswer = function (e, t) {
      var n = arguments.length >= 2 ? arguments[2] : arguments[0],
          i = r.apply(this, [n]);return t ? (i.then(e, t), Promise.resolve()) : i;
    };var a = function a(e, t, n) {
      var r = i.apply(this, [e]);return n ? (r.then(t, n), Promise.resolve()) : r;
    };t.setLocalDescription = a, a = function a(e, t, n) {
      var r = o.apply(this, [e]);return n ? (r.then(t, n), Promise.resolve()) : r;
    }, t.setRemoteDescription = a, a = function a(e, t, n) {
      var r = s.apply(this, [e]);return n ? (r.then(t, n), Promise.resolve()) : r;
    }, t.addIceCandidate = a;
  }function nt(e) {
    var t = e && e.navigator;if (t.mediaDevices && t.mediaDevices.getUserMedia) {
      var _e25 = t.mediaDevices,
          n = _e25.getUserMedia.bind(_e25);t.mediaDevices.getUserMedia = function (e) {
        return n(rt(e));
      };
    }!t.getUserMedia && t.mediaDevices && t.mediaDevices.getUserMedia && (t.getUserMedia = function (e, n, r) {
      t.mediaDevices.getUserMedia(e).then(n, r);
    }.bind(t));
  }function rt(e) {
    return e && void 0 !== e.video ? Object.assign({}, e, { video: Te(e.video) }) : e;
  }function it(e) {
    var t = e.RTCPeerConnection;e.RTCPeerConnection = function (e, n) {
      if (e && e.iceServers) {
        var _t19 = [];for (var _n22 = 0; _n22 < e.iceServers.length; _n22++) {
          var _r18 = e.iceServers[_n22];!_r18.hasOwnProperty("urls") && _r18.hasOwnProperty("url") ? (ye("RTCIceServer.url", "RTCIceServer.urls"), _r18 = JSON.parse(JSON.stringify(_r18)), _r18.urls = _r18.url, delete _r18.url, _t19.push(_r18)) : _t19.push(e.iceServers[_n22]);
        }e.iceServers = _t19;
      }return new t(e, n);
    }, e.RTCPeerConnection.prototype = t.prototype, "generateCertificate" in e.RTCPeerConnection && Object.defineProperty(e.RTCPeerConnection, "generateCertificate", { get: function get() {
        return t.generateCertificate;
      } });
  }function ot(e) {
    "object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.RTCTrackEvent && "receiver" in e.RTCTrackEvent.prototype && !("transceiver" in e.RTCTrackEvent.prototype) && Object.defineProperty(e.RTCTrackEvent.prototype, "transceiver", {
      get: function get() {
        return { receiver: this.receiver };
      }
    });
  }function st(e) {
    var t = e.RTCPeerConnection.prototype.createOffer;e.RTCPeerConnection.prototype.createOffer = function (e) {
      if (e) {
        void 0 !== e.offerToReceiveAudio && (e.offerToReceiveAudio = !!e.offerToReceiveAudio);var _t20 = this.getTransceivers().find(function (e) {
          return "audio" === e.receiver.track.kind;
        });!1 === e.offerToReceiveAudio && _t20 ? "sendrecv" === _t20.direction ? _t20.setDirection ? _t20.setDirection("sendonly") : _t20.direction = "sendonly" : "recvonly" === _t20.direction && (_t20.setDirection ? _t20.setDirection("inactive") : _t20.direction = "inactive") : !0 !== e.offerToReceiveAudio || _t20 || this.addTransceiver("audio"), void 0 !== e.offerToReceiveVideo && (e.offerToReceiveVideo = !!e.offerToReceiveVideo);var n = this.getTransceivers().find(function (e) {
          return "video" === e.receiver.track.kind;
        });!1 === e.offerToReceiveVideo && n ? "sendrecv" === n.direction ? n.setDirection ? n.setDirection("sendonly") : n.direction = "sendonly" : "recvonly" === n.direction && (n.setDirection ? n.setDirection("inactive") : n.direction = "inactive") : !0 !== e.offerToReceiveVideo || n || this.addTransceiver("video");
      }return t.apply(this, arguments);
    };
  }var at = n(8),
      lt = n.n(at);function ut(e) {
    if (!e.RTCIceCandidate || e.RTCIceCandidate && "foundation" in e.RTCIceCandidate.prototype) return;var t = e.RTCIceCandidate;e.RTCIceCandidate = function (e) {
      if ("object" == (typeof e === "undefined" ? "undefined" : (0, _typeof3.default)(e)) && e.candidate && 0 === e.candidate.indexOf("a=") && ((e = JSON.parse(JSON.stringify(e))).candidate = e.candidate.substr(2)), e.candidate && e.candidate.length) {
        var n = new t(e),
            _r19 = lt.a.parseCandidate(e.candidate),
            _i6 = Object.assign(n, _r19);return _i6.toJSON = function () {
          return { candidate: _i6.candidate, sdpMid: _i6.sdpMid, sdpMLineIndex: _i6.sdpMLineIndex, usernameFragment: _i6.usernameFragment };
        }, _i6;
      }return new t(e);
    }, e.RTCIceCandidate.prototype = t.prototype, ge(e, "icecandidate", function (t) {
      return t.candidate && Object.defineProperty(t, "candidate", { value: new e.RTCIceCandidate(t.candidate), writable: "false" }), t;
    });
  }function ct(e) {
    if (!e.RTCPeerConnection) return;var t = be(e);"sctp" in e.RTCPeerConnection.prototype || Object.defineProperty(e.RTCPeerConnection.prototype, "sctp", {
      get: function get() {
        return void 0 === this._sctp ? null : this._sctp;
      }
    });var n = function n(e) {
      if (!e || !e.sdp) return !1;var t = lt.a.splitSections(e.sdp);return t.shift(), t.some(function (e) {
        var t = lt.a.parseMLine(e);return t && "application" === t.kind && -1 !== t.protocol.indexOf("SCTP");
      });
    },
        r = function r(e) {
      var t = e.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);if (null === t || t.length < 2) return -1;var n = parseInt(t[1], 10);return n != n ? -1 : n;
    },
        i = function i(e) {
      var n = 65536;return "firefox" === t.browser && (n = t.version < 57 ? -1 === e ? 16384 : 2147483637 : t.version < 60 ? 57 === t.version ? 65535 : 65536 : 2147483637), n;
    },
        o = function o(e, n) {
      var r = 65536;"firefox" === t.browser && 57 === t.version && (r = 65535);var i = lt.a.matchPrefix(e.sdp, "a=max-message-size:");return i.length > 0 ? r = parseInt(i[0].substr(19), 10) : "firefox" === t.browser && -1 !== n && (r = 2147483637), r;
    },
        s = e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription = function () {
      if (this._sctp = null, "chrome" === t.browser && t.version >= 76) {
        var _getConfiguration = this.getConfiguration(),
            _e26 = _getConfiguration.sdpSemantics;

        "plan-b" === _e26 && Object.defineProperty(this, "sctp", {
          get: function get() {
            return void 0 === this._sctp ? null : this._sctp;
          },
          enumerable: !0, configurable: !0 });
      }if (n(arguments[0])) {
        var _e27 = r(arguments[0]),
            _t21 = i(_e27),
            _n23 = o(arguments[0], _e27);var _s3 = void 0;_s3 = 0 === _t21 && 0 === _n23 ? Number.POSITIVE_INFINITY : 0 === _t21 || 0 === _n23 ? Math.max(_t21, _n23) : Math.min(_t21, _n23);var _a2 = {};Object.defineProperty(_a2, "maxMessageSize", { get: function get() {
            return _s3;
          } }), this._sctp = _a2;
      }return s.apply(this, arguments);
    };
  }function dt(e) {
    if (!e.RTCPeerConnection || !("createDataChannel" in e.RTCPeerConnection.prototype)) return;function t(e, t) {
      var n = e.send;e.send = function () {
        var r = arguments[0],
            i = r.length || r.size || r.byteLength;if ("open" === e.readyState && t.sctp && i > t.sctp.maxMessageSize) throw new TypeError("Message too large (can send a maximum of " + t.sctp.maxMessageSize + " bytes)");return n.apply(e, arguments);
      };
    }var n = e.RTCPeerConnection.prototype.createDataChannel;e.RTCPeerConnection.prototype.createDataChannel = function () {
      var e = n.apply(this, arguments);return t(e, this), e;
    }, ge(e, "datachannel", function (e) {
      return t(e.channel, e.target), e;
    });
  }function ht(e) {
    if (!e.RTCPeerConnection || "connectionState" in e.RTCPeerConnection.prototype) return;var t = e.RTCPeerConnection.prototype;Object.defineProperty(t, "connectionState", {
      get: function get() {
        return { completed: "connected", checking: "connecting" }[this.iceConnectionState] || this.iceConnectionState;
      },
      enumerable: !0, configurable: !0 }), Object.defineProperty(t, "onconnectionstatechange", {
      get: function get() {
        return this._onconnectionstatechange || null;
      },
      set: function set(e) {
        this._onconnectionstatechange && (this.removeEventListener("connectionstatechange", this._onconnectionstatechange), delete this._onconnectionstatechange), e && this.addEventListener("connectionstatechange", this._onconnectionstatechange = e);
      },
      enumerable: !0, configurable: !0 }), ["setLocalDescription", "setRemoteDescription"].forEach(function (e) {
      var n = t[e];t[e] = function () {
        return this._connectionstatechangepoly || (this._connectionstatechangepoly = function (e) {
          var t = e.target;if (t._lastConnectionState !== t.connectionState) {
            t._lastConnectionState = t.connectionState;var _n24 = new Event("connectionstatechange", e);t.dispatchEvent(_n24);
          }return e;
        }, this.addEventListener("iceconnectionstatechange", this._connectionstatechangepoly)), n.apply(this, arguments);
      };
    });
  }function ft(e) {
    if (!e.RTCPeerConnection) return;var t = be(e);if ("chrome" === t.browser && t.version >= 71) return;var n = e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription = function (e) {
      return e && e.sdp && -1 !== e.sdp.indexOf("\na=extmap-allow-mixed") && (e.sdp = e.sdp.split("\n").filter(function (e) {
        return "a=extmap-allow-mixed" !== e.trim();
      }).join("\n")), n.apply(this, arguments);
    };
  }!function () {
    var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        e = _ref3.window;

    var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { shimChrome: !0, shimFirefox: !0, shimEdge: !0, shimSafari: !0 };
    var n = ve,
        l = be(e),
        u = { browserDetails: l, commonShim: a, extractVersion: pe, disableLog: _e, disableWarnings: me };switch (l.browser) {case "chrome":
        if (!r || !Le || !t.shimChrome) return n("Chrome shim is not included in this adapter release."), u;n("adapter.js shimming chrome."), u.browserShim = r, Ae(e), Ie(e), Le(e), Re(e), Oe(e), ke(e), xe(e), Me(e), Pe(e), ut(e), ht(e), ct(e), dt(e), ft(e);break;case "firefox":
        if (!o || !Be || !t.shimFirefox) return n("Firefox shim is not included in this adapter release."), u;n("adapter.js shimming firefox."), u.browserShim = o, ze(e), Be(e), Ve(e), Ke(e), We(e), Ye(e), Je(e), Qe(e), $e(e), Ze(e), ut(e), ht(e), ct(e), dt(e);break;case "edge":
        if (!i || !He || !t.shimEdge) return n("MS edge shim is not included in this adapter release."), u;n("adapter.js shimming edge."), u.browserShim = i, Ue(e), Fe(e), He(e), qe(e), ct(e), dt(e);break;case "safari":
        if (!s || !t.shimSafari) return n("Safari shim is not included in this adapter release."), u;n("adapter.js shimming safari."), u.browserShim = s, it(e), st(e), tt(e), Xe(e), et(e), ot(e), nt(e), ut(e), ct(e), dt(e), ft(e);break;default:
        n("Unsupported browser!");}
  }({ window: window });var pt = function (_re5) {
    (0, _inherits3.default)(pt, _re5);

    function pt(e) {
      var _this63, _ret5;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, pt);
      return _ret5 = ((_this63 = (0, _possibleConstructorReturn3.default)(this, (pt.__proto__ || Object.getPrototypeOf(pt)).call(this, e)), _this63), _this63._libwebphone = e, _this63._emit = _this63._libwebphone._mediaDevicesEvent, _this63._initProperties(t), _this63._initInternationalization(t.i18n || {}), _this63._initInputStreams(), _this63._initAvailableDevices(), _this63._initEventBindings(), _this63._initRenderTargets(), _this63._emit("created", _this63), _this63), (0, _possibleConstructorReturn3.default)(_this63, _ret5);
    }

    (0, _createClass3.default)(pt, [{
      key: "startStreams",
      value: function startStreams() {
        var _this64 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        return this._startMediaElements(), this._inputActive ? this._mediaStreamPromise.then(function (t) {
          return _this64._createCallStream(t, e);
        }) : this._startInputStreams().then(function (t) {
          return _this64._inputActive = !0, _this64._emit("streams.started", _this64, t), _this64._createCallStream(t, e);
        });
      }
    }, {
      key: "stopStreams",
      value: function stopStreams() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        e || (e = null);var t = this._startedStreams.findIndex(function (t) {
          return t.id == e;
        });-1 != t && this._startedStreams.splice(t, 1).forEach(function (e) {
          e.mediaStream && e.mediaStream.getTracks().forEach(function (e) {
            e.enabled = !1, e.stop();
          });
        }), 0 == this._startedStreams.length && this.stopAllStreams();
      }
    }, {
      key: "stopAllStreams",
      value: function stopAllStreams() {
        var _this65 = this;

        return this._startedStreams.forEach(function (e) {
          e.mediaStream && e.mediaStream.getTracks().forEach(function (e) {
            e.enabled = !1, e.stop();
          });
        }), this._startedStreams = [], this._mediaStreamPromise.then(function (e) {
          e.getTracks().forEach(function (t) {
            _this65._removeTrack(e, t, !1);
          }), _this65._inputActive = !1, _this65._emit("streams.stopped", _this65);
        });
      }
    }, {
      key: "mute",
      value: function mute() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        switch (e) {case "audiooutput":
            return this._muteOutput(e);default:
            return this._muteInput(e);}
      }
    }, {
      key: "unmute",
      value: function unmute() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        switch (e) {case "audiooutput":
            return this._unmuteOutput(e);default:
            return this._unmuteInput(e);}
      }
    }, {
      key: "toggleMute",
      value: function toggleMute() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        switch (e) {case "audiooutput":
            return this._toggleUuteOutput(e);default:
            return this._toggleMuteInput(e);}
      }
    }, {
      key: "getMediaElement",
      value: function getMediaElement(e) {
        if (this._config[e] && this._config[e].mediaElement.element) return this._config[e].mediaElement.element;
      }
    }, {
      key: "getPreferedDevice",
      value: function getPreferedDevice(e) {
        return this._availableDevices[e].find(function (e) {
          return e.selected;
        });
      }
    }, {
      key: "changeDevice",
      value: function () {
        var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(e, t) {
          var n, r;
          return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  n = this._findAvailableDevice(e, t);

                  if (!(!n || !n.connected)) {
                    _context.next = 3;
                    break;
                  }

                  return _context.abrupt("return", Promise.reject());

                case 3:
                  _context.next = 5;
                  return this._changeStreamMutex.acquire();

                case 5:
                  r = _context.sent;
                  _context.t0 = (this._preferDevice(n), e);
                  _context.next = _context.t0 === "audiooutput" ? 9 : 10;
                  break;

                case 9:
                  return _context.abrupt("return", this._changeOutputDevice(n).then(function () {
                    r();
                  }));

                case 10:
                  return _context.abrupt("return", this._changeInputDevice(n).then(function () {
                    r();
                  }));

                case 11:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));

        function changeDevice(_x47, _x48) {
          return _ref4.apply(this, arguments);
        }

        return changeDevice;
      }()
    }, {
      key: "refreshAvailableDevices",
      value: function () {
        var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
          var _this66 = this;

          return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  return _context3.abrupt("return", this._shimEnumerateDevices().then(function () {
                    var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(e) {
                      var t, n;
                      return _regenerator2.default.wrap(function _callee2$(_context2) {
                        while (1) {
                          switch (_context2.prev = _context2.next) {
                            case 0:
                              _context2.next = 2;
                              return _this66._changeStreamMutex.acquire();

                            case 2:
                              t = _context2.sent;
                              n = [];
                              return _context2.abrupt("return", (_this66._forEachAvailableDevice(function (e) {
                                "none" != e.id && (e.connected = !1);
                              }), _this66._importInputDevices(e), Object.keys(_this66._availableDevices).forEach(function (e) {
                                var t = _this66._availableDevices[e].find(function (e) {
                                  return e.selected;
                                }),
                                    r = _this66._availableDevices[e].find(function (e) {
                                  return e.connected && "none" != e.id;
                                }),
                                    i = t && r && t.preference < r.preference,
                                    o = t && !t.connected;(i || o) && (t.selected = !1, n.push(t.trackKind), r && (r.selected = !0));
                              }), _this66._mediaStreamPromise.then(function (e) {
                                var r = _this66._createConstraints(),
                                    i = {};return e.getTracks().forEach(function (t) {
                                  var r = X.trackParameters(e, t),
                                      i = X.trackKindtoDeviceKind(t.kind),
                                      o = _this66._availableDevices[i].find(function (e) {
                                    return e.selected;
                                  });if (o) {
                                    var _i7 = o.id != r.settings.deviceId,
                                        _s4 = o.label != t.label;(_i7 || _s4) && (n.push(t.kind), _this66._removeTrack(e, t));
                                  } else "live" != t.readyState && (n.push(t.kind), _this66._removeTrack(e, t));
                                }), n.forEach(function (e) {
                                  r[e] && (i[e] = r[e]);
                                }), t(), _this66._startInputStreams(i);
                              })));

                            case 5:
                            case "end":
                              return _context2.stop();
                          }
                        }
                      }, _callee2, _this66);
                    }));

                    return function (_x49) {
                      return _ref6.apply(this, arguments);
                    };
                  }()).then(function () {
                    _this66._sortAvailableDevices(), _this66.updateRenders();
                  }));

                case 1:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3, this);
        }));

        function refreshAvailableDevices() {
          return _ref5.apply(this, arguments);
        }

        return refreshAvailableDevices;
      }()
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this67 = this;

        this.render(function (e) {
          return e.data = _this67._renderData(e.data), e;
        });
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { none: "None", audiooutput: "Speaker", audioinput: "Microphone", videoinput: "Camera", loading: "Finding media devices..." } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("mediaDevices", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        var _this68 = this;

        var t = { audiooutput: { enabled: "sinkId" in HTMLMediaElement.prototype, show: !0, preferedDeviceIds: [], mediaElement: { create: !0, elementId: null, element: null, initParameters: { muted: !1 } } }, audioinput: { enabled: !0, show: !0, constraints: {}, preferedDeviceIds: [], mediaElement: { create: !1, elementId: null, element: null, initParameters: { muted: !0 } } }, videoinput: { enabled: !0, show: !0, constraints: {}, preferedDeviceIds: [], mediaElement: { create: !1, elementId: null, element: null, initParameters: { muted: !0 } } }, renderTargets: [], detectDeviceChanges: !0, manageMediaElements: !0 };this._config = X.merge(t, e), this._loaded = !1, this._changeStreamMutex = new de.Mutex(), this._inputActive = !1, this._startedStreams = [], this._availableDevices = {}, this._deviceKinds().forEach(function (e) {
          !_this68._config[e].mediaElement.element && _this68._config[e].mediaElement.elementId && (_this68._config[e].mediaElement.element = document.getElementById(_this68._config[e].mediaElement.elementId)), !_this68._config[e].mediaElement.element && _this68._config[e].mediaElement.create && _this68._config[e].enabled && (_this68._config[e].mediaElement.element = document.createElement(_this68._deviceKindtoTrackKind(e))), _this68._config[e].mediaElement.element && (X.mediaElementEvents().forEach(function (t) {
            _this68._config[e].mediaElement.element.addEventListener(t, function (n) {
              _this68._emit(_this68._deviceKindtoEventKind(e) + "." + t, _this68, _this68._config[e].mediaElement.element, n);
            });
          }), _this68._config[e].mediaElement.element.preload = "none", _this68._config.manageMediaElements && Object.keys(_this68._config[e].mediaElement.initParameters).forEach(function (t) {
            _this68._config[e].mediaElement.element[t] = _this68._config[e].mediaElement.initParameters[t];
          })), _this68._config[e].mediaElement.element && _this68._emit(_this68._deviceKindtoEventKind(e) + ".element", _this68, _this68._config[e].mediaElement.element), _this68._availableDevices[e] = [], _this68._config[e].show = _this68._config[e].enabled && _this68._config[e].show;
        }), this._availableDevices.videoinput = [this._deviceParameters({ deviceId: "none", label: "libwebphone:mediaDevices.none", kind: "videoinput", displayOrder: 0 })];
      }
    }, {
      key: "_initInputStreams",
      value: function _initInputStreams() {
        var _this69 = this;

        var e = { audio: this._config.audioinput.enabled, video: this._config.videoinput.enabled };return e.audio && this._config.audioinput.preferedDeviceIds.length > 0 && (e.audio = {}, e.audio.deviceId = this._config.audioinput.preferedDeviceIds), e.video && this._config.audioinput.preferedDeviceIds.length > 0 && (e.video = {}, e.video.deviceId = this._config.videoinput.preferedDeviceIds), this._mediaStreamPromise = this._shimGetUserMedia(e).then(function (e) {
          return _this69._updateMediaElements(e), e;
        }).catch(function (t) {
          if (_this69._emit("getUserMedia.error", _this69, t), e.video && e.audio) return delete e.video, _this69._shimGetUserMedia(e).then(function (e) {
            return _this69._updateMediaElements(e), e;
          });
        }), this._mediaStreamPromise;
      }
    }, {
      key: "_initAvailableDevices",
      value: function _initAvailableDevices() {
        var _this70 = this;

        this._mediaStreamPromise.then(function (e) {
          _this70._shimEnumerateDevices().then(function (t) {
            _this70._importInputDevices(t), e.getTracks().forEach(function (t) {
              _this70._addTrack(e, t), _this70._removeTrack(e, t, !1);
            }), _this70._sortAvailableDevices(), Object.keys(_this70._availableDevices).forEach(function (e) {
              if (!_this70._availableDevices[e].find(function (e) {
                return e.selected;
              })) {
                var _t22 = _this70._availableDevices[e][0];_t22 && (_t22.selected = !0);
              }
            }), _this70._loaded = !0, _this70.updateRenders();
          });
        });
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this71 = this;

        this._libwebphone.on("call.terminated", function (e, t) {
          _this71.stopStreams(t.getId());
        }), this._config.detectDeviceChanges && (navigator.mediaDevices.ondevicechange = function () {
          _this71.refreshAvailableDevices();
        }), this._libwebphone.on("audioContext.preview.loopback.started", function () {
          _this71.startStreams("loopbackPreview");
        }), this._libwebphone.on("audioContext.preview.loopback.stopped", function () {
          _this71.stopStreams("loopbackPreview");
        }), this._libwebphone.on("audioContext.started", function () {
          _this71._startMediaElements();
        }), this._libwebphone.on("mediaDevices.streams.started", function () {
          _this71.updateRenders();
        }), this._libwebphone.on("mediaDevices.streams.stop", function () {
          _this71.updateRenders();
        }), this._libwebphone.on("mediaDevices.audio.output.changed", function () {
          _this71.updateRenders();
        }), this._libwebphone.on("mediaDevices.audio.input.changed", function () {
          _this71.updateRenders();
        }), this._libwebphone.on("mediaDevices.video.input.changed", function () {
          _this71.updateRenders();
        }), this._libwebphone.on("mediaDevices.getUserMedia.error", function () {
          _this71.updateRenders();
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this72 = this;

        this._config.renderTargets.map(function (e) {
          return _this72.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this73 = this;

        return { template: this._renderDefaultTemplate(), i18n: { none: "libwebphone:mediaDevices.none", audiooutput: "libwebphone:mediaDevices.audiooutput", audioinput: "libwebphone:mediaDevices.audioinput", videoinput: "libwebphone:mediaDevices.videoinput", loading: "libwebphone:mediaDevices.loading" }, by_id: { audiooutput: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;if (t.options) {
                    var _e28 = t.options[t.selectedIndex].value;_this73.changeDevice("audiooutput", _e28);
                  }
                } } }, audioinput: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;if (t.options) {
                    var _e29 = t.options[t.selectedIndex].value;_this73.changeDevice("audioinput", _e29);
                  }
                } } }, videoinput: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;if (t.options) {
                    var _e30 = t.options[t.selectedIndex].value;_this73.changeDevice("videoinput", _e30);
                  }
                } } } }, data: X.merge({}, this._config, this._renderData()) };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n        <div>\n          {{#data.loaded}}\n            {{#data.audiooutput.show}}\n              <div>\n                <label for="{{by_id.audiooutput.elementId}}">\n                  {{i18n.audiooutput}}\n                </label>\n                <select id="{{by_id.audiooutput.elementId}}">\n                  {{#data.audiooutput.devices}}\n                    {{#connected}}\n                      <option value="{{id}}" {{#selected}}selected{{/selected}}>{{name}}</option>\n                    {{/connected}}\n                  {{/data.audiooutput.devices}}\n                </select>\n              </div>\n            {{/data.audiooutput.show}}\n\n            {{#data.audioinput.show}}\n              <div>\n                <label for="{{by_id.audioinput.elementId}}">\n                  {{i18n.audioinput}}\n                </label>\n                <select id="{{by_id.audioinput.elementId}}">\n                  {{#data.audioinput.devices}}\n                    {{#connected}}\n                      <option value="{{id}}" {{#selected}}selected{{/selected}}>{{name}}</option>\n                    {{/connected}}    \n                  {{/data.audioinput.devices}}\n                </select> \n              </div>\n            {{/data.audioinput.show}}\n\n            {{#data.videoinput.show}}          \n              <div>\n                <label for="{{by_id.videoinput.elementId}}">\n                  {{i18n.videoinput}}\n                </label>                \n                <select id="{{by_id.videoinput.elementId}}">\n                  {{#data.videoinput.devices}}\n                      {{#connected}}\n                        <option value="{{id}}" {{#selected}}selected{{/selected}}>{{name}}</option>\n                      {{/connected}}\n                  {{/data.videoinput.devices}}\n                </select>\n              </div>\n            {{/data.videoinput.show}}\n          {{/data.loaded}}\n\n          {{^data.loaded}}\n            <div style="margin: 50px 5px;">\n              <div class="spinner">\n                <div class="bounce1"></div>\n                <div class="bounce2"></div>\n                <div class="bounce3"></div>\n              </div>\n              <div style="text-align: center;">{{i18n.loading}}</div>\n            </div>\n          {{/data.loaded}}\n        </div>\n        ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var _this74 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        return e.loaded = this._loaded, Object.keys(this._availableDevices).forEach(function (t) {
          var n = _this74._availableDevices[t].slice(0);n.sort(function (e, t) {
            return (e.displayOrder || 0) - (t.displayOrder || 0);
          }), e[t] || (e[t] = {}), e[t].devices = n;
        }), e;
      }
    }, {
      key: "_changeOutputDevice",
      value: function () {
        var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(e) {
          var _this75 = this;

          return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  return _context4.abrupt("return", this._config.audiooutput.mediaElement.element ? this._config.audiooutput.mediaElement.element.setSinkId(e.id).then(function () {
                    _this75._availableDevices[e.deviceKind].forEach(function (t) {
                      t.id == e.id ? t.selected = !0 : t.selected = !1;
                    }), _this75._config.audiooutput.enabled && _this75._emit("audio.output.changed", _this75, e);
                  }) : (this._availableDevices[e.deviceKind].forEach(function (t) {
                    t.id == e.id ? t.selected = !0 : t.selected = !1;
                  }), this._config.audiooutput.enabled && this._emit("audio.output.changed", this, e), Promise.resolve()));

                case 1:
                case "end":
                  return _context4.stop();
              }
            }
          }, _callee4, this);
        }));

        function _changeOutputDevice(_x51) {
          return _ref7.apply(this, arguments);
        }

        return _changeOutputDevice;
      }()
    }, {
      key: "_muteInput",
      value: function _muteInput() {
        var _this76 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        return this._mediaStreamPromise.then(function (t) {
          var n = _this76._deviceKindtoTrackKind(e);return t.getTracks().forEach(function (e) {
            if (!n || e.kind == n) {
              var _n25 = X.trackParameters(t, e);e.enabled = !1, _this76._emit(e.kind + ".input.muted", _this76, _n25);
            }
          }), t;
        });
      }
    }, {
      key: "_unmuteInput",
      value: function _unmuteInput() {
        var _this77 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        return this._mediaStreamPromise.then(function (t) {
          var n = _this77._deviceKindtoTrackKind(e);return t.getTracks().forEach(function (e) {
            if (!n || e.kind == n) {
              var _n26 = X.trackParameters(t, e);e.enabled = !0, _this77._emit(e.kind + ".input.unmuted", _this77, _n26);
            }
          }), t;
        });
      }
    }, {
      key: "_toggleMuteInput",
      value: function _toggleMuteInput() {
        var _this78 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        return this._mediaStreamPromise.then(function (t) {
          var n = _this78._deviceKindtoTrackKind(e);return t.getTracks().forEach(function (e) {
            if (!n || e.kind == n) {
              var _n27 = X.trackParameters(t, e);e.enabled = !e.enabled, e.enabled ? _this78._emit(e.kind + ".input.unmuted", _this78, _n27) : _this78._emit(e.kind + ".input.muted", _this78, _n27);
            }
          }), t;
        });
      }
    }, {
      key: "_changeInputDevice",
      value: function _changeInputDevice(e) {
        var _this79 = this;

        return this._mediaStreamPromise.then(function (t) {
          var n = [];var r = e.trackKind,
              i = _this79._createConstraints(e)[r],
              o = t.getTracks().find(function (t) {
            return t.kind == e.trackKind;
          }),
              s = X.trackParameters(t, o);if (o && (n = o.enabled ? [] : [o.kind], _this79._removeTrack(t, o)), i) {
            var _e31 = {};return _e31[r] = i, _this79._startInputStreams(_e31, n).then(function () {
              var e = t.getTracks().find(function (e) {
                return e.kind == r && "live" == e.readyState;
              });0 == _this79._startedStreams.length && _this79.stopAllStreams(), e && _this79._emit(r + ".input.changed", _this79, X.trackParameters(t, e), s);
            });
          }_this79._availableDevices[e.deviceKind].forEach(function (e) {
            "none" == e.id ? e.selected = !0 : e.selected = !1;
          }), _this79._emit(r + ".input.changed", _this79, null, s);
        });
      }
    }, {
      key: "_startInputStreams",
      value: function _startInputStreams() {
        var _this80 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        return e || (e = this._createConstraints()), this._mediaStreamPromise.then(function (t) {
          return t.getTracks().forEach(function (n) {
            "live" == n.readyState ? delete e[n.kind] : _this80._removeTrack(t, n);
          }), 0 == Object.keys(e).length ? Promise.resolve(t) : _this80._shimGetUserMedia(e).then(function (e) {
            return e.getTracks().forEach(function (e) {
              _this80._addTrack(t, e);
            }), t;
          }).then(function (e) {
            return _this80._updateMediaElements(e), e;
          }).catch(function (e) {
            _this80._emit("getUserMedia.error", _this80, e);
          });
        });
      }
    }, {
      key: "_updateMediaElements",
      value: function _updateMediaElements(e) {
        var _this81 = this;

        X.trackKinds().forEach(function (t) {
          var n = X.trackKindtoDeviceKind(t),
              r = _this81._config[n].mediaElement.element;e.getTracks().find(function (e) {
            return e.kind == t;
          }) ? (!r || r.srcObject && r.srcObject.id == e.id || (r.srcObject = e), _this81._config.manageMediaElements && r && r.paused && r.play().catch(function () {})) : (_this81._config.manageMediaElements && r && !r.paused && r.pause(), r && (r.srcObject = null));
        });
      }
    }, {
      key: "_createConstraints",
      value: function _createConstraints() {
        for (var _len29 = arguments.length, e = Array(_len29), _key29 = 0; _key29 < _len29; _key29++) {
          e[_key29] = arguments[_key29];
        }

        var t = this._availableDevices.audioinput.find(function (e) {
          return e.selected && e.connected;
        }),
            n = this._availableDevices.videoinput.find(function (e) {
          return e.selected && e.connected;
        });var r = { audio: this._config.audioinput.constraints || {}, video: this._config.videoinput.constraints || {} };if (e.forEach(function (e) {
          switch (e.deviceKind) {case "audioinput":
              t = e;break;case "videoinput":
              n = e;}
        }), t) {
          var _e32 = t.constraints || {};_e32.deviceId = {}, _e32.deviceId.exact = t.id, r.audio = X.merge(r.audio, _e32);
        }if (n) {
          var _e33 = n.constraints || {};_e33.deviceId = {}, _e33.deviceId.exact = n.id, r.video = X.merge(r.video, _e33);
        }return (!this._config.audioinput.enabled || r.audio && r.audio.deviceId && "none" == r.audio.deviceId.exact) && delete r.audio, (!this._config.videoinput.enabled || r.video && r.video.deviceId && "none" == r.video.deviceId.exact) && delete r.video, r;
      }
    }, {
      key: "_preferDevice",
      value: function _preferDevice(e) {
        var _this82 = this;

        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { sort: !0, updateConfig: !0 };
        var n = this._availableDevices[e.deviceKind].reduce(function (t, n) {
          return (n.preference || 0) > t && n.id != e.id ? n.preference : t;
        }, 0);if (e.preference = n + 1, t.sort && this._sortAvailableDevices(), t.updateConfig && "none" != e.id) {
          var _t23 = e.deviceKind,
              _n28 = this._config[_t23].preferedDeviceIds.findIndex(function (n) {
            var r = _this82._findAvailableDevice(_t23, n);return n != e.id && r && r.connected;
          }),
              _r20 = this._config[_t23].preferedDeviceIds.indexOf(e.id);_r20 > -1 && this._config[_t23].preferedDeviceIds.splice(_r20, 1), -1 == _n28 ? this._config[_t23].preferedDeviceIds.push(e.id) : this._config[_t23].preferedDeviceIds.splice(_n28, 0, e.id);
        }
      }
    }, {
      key: "_startMediaElements",
      value: function _startMediaElements() {
        var _this83 = this;

        this._config.manageMediaElements && this._deviceKinds().forEach(function (e) {
          _this83._config[e].mediaElement.element && _this83._config[e].mediaElement.element.paused && _this83._config[e].mediaElement.element.play();
        });
      }
    }, {
      key: "_createCallStream",
      value: function _createCallStream(e, t) {
        var n = new MediaStream();return e.getTracks().forEach(function (e) {
          n.addTrack(e.clone());
        }), t ? this._startedStreams.find(function (e) {
          return e.id == t;
        }) || this._startedStreams.push({ id: t, mediaStream: n }) : this._startedStreams.push({ id: null, mediaStream: n }), n;
      }
    }, {
      key: "_addTrack",
      value: function _addTrack(e, t) {
        var n = X.trackParameters(e, t);e.addTrack(t), this._availableDevices[n.deviceKind].forEach(function (e) {
          e.id == n.settings.deviceId ? Object.assign(e, n, { selected: !0 }) : e.selected = !1;
        }), this._emit(t.kind + ".input.started", this, n), t.enabled ? this._emit(t.kind + ".input.unmuted", this, n) : this._emit(t.kind + ".input.muted", this, n);
      }
    }, {
      key: "_removeTrack",
      value: function _removeTrack(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : !0;
        var r = X.trackParameters(e, t);t.enabled = !1, t.stop(), e.removeTrack(t), n && this._availableDevices[r.deviceKind].forEach(function (e) {
          e.id == r.settings.deviceId ? Object.assign(e, r, { selected: !1 }) : "none" == e.id ? e.selected = !0 : e.selected = !1;
        }), this._emit(t.kind + ".input.stopped", this, r);
      }
    }, {
      key: "_findAvailableDevice",
      value: function _findAvailableDevice(e, t) {
        return this._availableDevices[e].find(function (e) {
          return e.id == t;
        });
      }
    }, {
      key: "_forEachAvailableDevice",
      value: function _forEachAvailableDevice(e) {
        var _this84 = this;

        Object.keys(this._availableDevices).forEach(function (t) {
          _this84._availableDevices[t].forEach(e);
        });
      }
    }, {
      key: "_sortAvailableDevices",
      value: function _sortAvailableDevices() {
        var _this85 = this;

        Object.keys(this._availableDevices).forEach(function (e) {
          _this85._availableDevices[e].sort(function (e, t) {
            return (t.preference || 0) - (e.preference || 0);
          });
        });
      }
    }, {
      key: "_importInputDevices",
      value: function _importInputDevices(e) {
        var _this86 = this;

        e.forEach(function (e) {
          if (!e.deviceId || 0 === e.deviceId.length) return;var t = _this86._deviceParameters(e),
              n = _this86._findAvailableDevice(e.kind, e.deviceId);n ? Object.assign(n, t) : (_this86._availableDevices[e.kind] || (_this86._availableDevices[e.kind] = []), t.displayOrder = _this86._availableDevices[e.kind].length, t.preference = (_this86._config[e.kind].preferedDeviceIds || []).indexOf(t.id) + 1, _this86._availableDevices[e.kind].push(t));
        });
      }
    }, {
      key: "_deviceParameters",
      value: function _deviceParameters(e) {
        return { id: e.deviceId, label: e.label, deviceKind: e.kind, name: this._getDeviceName(e), trackKind: this._deviceKindtoTrackKind(e.kind), connected: !0 };
      }
    }, {
      key: "_getDeviceName",
      value: function _getDeviceName(e) {
        var t = e.kind,
            n = "libwebphone:mediaDevices." + t;return e.label || n + " " + (this._availableDevices[t].length + 1);
      }
    }, {
      key: "_deviceKindtoTrackKind",
      value: function _deviceKindtoTrackKind(e) {
        switch (e) {case "audiooutput":case "audioinput":
            return "audio";case "videoinput":
            return "video";}
      }
    }, {
      key: "_deviceKindtoEventKind",
      value: function _deviceKindtoEventKind(e) {
        switch (e) {case "audiooutput":
            return "audio.output";case "audioinput":
            return "audio.input";case "videoinput":
            return "video.input";}
      }
    }, {
      key: "_deviceKinds",
      value: function _deviceKinds() {
        return ["audiooutput", "audioinput", "videoinput"];
      }
    }, {
      key: "_shimEnumerateDevices",
      value: function _shimEnumerateDevices() {
        return navigator.mediaDevices.enumerateDevices();
      }
    }, {
      key: "_shimGetUserMedia",
      value: function _shimGetUserMedia(e) {
        return navigator.mediaDevices.getUserMedia(e);
      }
    }]);
    return pt;
  }(re),
      gt = function (_re6) {
    (0, _inherits3.default)(gt, _re6);

    function gt(e) {
      var _this87, _ret6;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, gt);
      return _ret6 = ((_this87 = (0, _possibleConstructorReturn3.default)(this, (gt.__proto__ || Object.getPrototypeOf(gt)).call(this, e)), _this87), _this87._libwebphone = e, _this87._emit = _this87._libwebphone._videoCanvasEvent, _this87._initProperties(t), _this87._initInternationalization(t.i18n || {}), _this87._initEventBindings(), _this87._initRenderTargets(), _this87._emit("created", _this87), _this87), (0, _possibleConstructorReturn3.default)(_this87, _ret6);
    }

    (0, _createClass3.default)(gt, [{
      key: "enableImage",
      value: function enableImage(e) {
        var t = this._configGetImage(e),
            n = this._canvasGetImage(this._canvasRender, e);return t && (t.enabled = !0), n && (n.enabled = !0), n;
      }
    }, {
      key: "disableImage",
      value: function disableImage(e) {
        var t = this._configGetImage(e),
            n = this._canvasGetImage(this._canvasRender, e);return t && (t.enabled = !1), n && (n.enabled = !1), n;
      }
    }, {
      key: "toggleImage",
      value: function toggleImage(e) {
        return this.isImageEnabled(e) ? this.disableImage(e) : this.enableImage(e);
      }
    }, {
      key: "isImageEnabled",
      value: function isImageEnabled(e) {
        var t = this._configGetImage(e);return t && t.enabled || !1;
      }
    }, {
      key: "rescaleImage",
      value: function rescaleImage(e) {
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        if (t) {
          var _n29 = this._configGetImage(e);_n29 && (_n29.rescale = t);
        }var n = this._canvasGetImage(this._canvasRender, e);return this._rescaleCanvasImage(this._canvasRender, n, t);
      }
    }, {
      key: "positionImage",
      value: function positionImage(e) {
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var r = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var i = this._configGetImage(e),
            o = this._canvasGetImage(this._canvasRender, e),
            s = this._positionCanvasImage(this._canvasRender, o, t, n, r);return i && (s ? i.position = s.position : (i.position || (i.position = { mode: "center" }), t && (i.position.mode = t), n && (i.position.x = n), r && (i.position.y = r))), s;
      }
    }, {
      key: "changeFramesPerSecond",
      value: function changeFramesPerSecond(e) {
        var _this88 = this;

        this._config.canvasLoop.framesPerSecond = e;var t = this._canvasRender;t && (t.timer && (clearTimeout(t.timer), t.timer = null), t.framesPerSecond = this._config.canvasLoop.framesPerSecond, t.timer = setInterval(function () {
          _this88._renderCanvas(t);
        }, 1e3 / t.framesPerSecond));
      }
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this89 = this;

        this.render(function (e) {
          return e.data = _this89._renderData(e.data), e;
        });
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { piprescale: "Preview Rescale", pip: "Preview PIP", framespersecond: "Canvas Frames per Second", pipenable: "Enable", pipdisable: "Disable", fullscreen: "Full Screen", startfullscreen: "Start", stopfullscreen: "Exit", screenshare: "Screen Share", startscreenshare: "Start", stopscreenshare: "Stop" } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("videoCanvas", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        var _this90 = this;

        "string" == typeof e.canvas && (e.canvas = { root: { elementId: e.canvas } });var t = { renderTargets: [], canvas: { root: { elementId: null, element: null, defaultWidth: 640, defaultHeight: 480 } }, fullscreen: { show: !1, supported: !!(document.fullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled || document.webkitSupportsFullscreen || document.webkitFullscreenEnabled) }, localVideo: { name: "localVideo", enabled: !0, show: !0, rescale: .25, averageRGB: { threshold: 1 }, position: { mode: "bottom-right" } }, remoteVideo: { name: "remoteVideo", enabled: !0, show: !0, rescale: 1, averageRGB: { threshold: 1 }, position: { mode: "center" } }, canvasLoop: { show: !0, framesPerSecond: 15 }, strings: [{ name: "dialpadTarget" }, { name: "remoteIdentity" }, { name: "callTimer" }], images: [{ name: "disconnected", enabled: !0, rescale: .5, position: { mode: "center" }, source: "data:image/svg+xml;base64,PHN2ZyBpZD0idGVzdCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iNzAuNTQ2N21tIiBoZWlnaHQ9IjcwLjU0NjdtbSIgdmlld0JveD0iMCAwIDIwMCAyMDAiPgo8cGF0aCBpZD0iU2VsZWN0aW9uIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxIiBkPSJNIDEwNC4wMCwxMjUuMDAmIzEwOyAgICAgICAgICAgQyAxMDQuMDAsMTI1LjAwIDExMS40Miw4NS4wMCAxMTEuNDIsODUuMDAmIzEwOyAgICAgICAgICAgICAxMTMuMjQsNzYuNzkgMTE5LjM5LDUzLjkzIDExOC45MCw0Ny4wMCYjMTA7ICAgICAgICAgICAgIDExNy40OSwyNi44MiA5MC45OCwyNS4wNyA4My4yMywzOC4wMiYjMTA7ICAgICAgICAgICAgIDc5LjUzLDQ0LjE5IDgxLjA1LDU0LjI2IDgyLjQwLDYxLjAwJiMxMDsgICAgICAgICAgICAgODIuNDAsNjEuMDAgOTIuMjUsMTA2LjAwIDkyLjI1LDEwNi4wMCYjMTA7ICAgICAgICAgICAgIDkyLjgwLDEwOS4xOSA5NC41OCwxMjIuNDEgOTYuNTksMTIzLjk4JiMxMDsgICAgICAgICAgICAgOTguMjIsMTI1LjI0IDEwMS45OCwxMjQuOTkgMTA0LjAwLDEyNS4wMCBaJiMxMDsgICAgICAgICAgIE0gNzQuMDAsNTEuMDAmIzEwOyAgICAgICAgICAgQyA3NC4wMCw0MS4wMSA3My40Nyw0Mi43NCA3Ni4wMCwzMy4wMCYjMTA7ICAgICAgICAgICAgIDU3LjY3LDMzLjQwIDMyLjQ0LDQ2LjUyIDE4LjAwLDU3LjM3JiMxMDsgICAgICAgICAgICAgMTQuNzksNTkuNzkgNS4yMiw2Ni41MyA2LjM0LDcxLjAwJiMxMDsgICAgICAgICAgICAgNi44MSw3Mi44OCA5LjYxLDc1LjYzIDExLjAwLDc2Ljk4JiMxMDsgICAgICAgICAgICAgMTIuMjQsNzguMTggMTQuMzEsODAuMjQgMTYuMDAsODAuNjYmIzEwOyAgICAgICAgICAgICAxOS40Myw4MS41MyAyOS43MSw3MS43OSAzMy4wMCw2OS40MyYjMTA7ICAgICAgICAgICAgIDQ1LjIxLDYwLjY3IDU5LjIxLDUzLjk4IDc0LjAwLDUxLjAwIFomIzEwOyAgICAgICAgICAgTSAxMjQuMDAsMzMuMDAmIzEwOyAgICAgICAgICAgQyAxMjUuMzIsNDIuMzkgMTI2LjgyLDQwLjg0IDEyNS4wMCw1MS4wMCYjMTA7ICAgICAgICAgICAgIDEzOS43MCw1Ni41MCAxNDcuMDUsNTcuOTEgMTYxLjAwLDY3LjA4JiMxMDsgICAgICAgICAgICAgMTY0LjgzLDY5LjYwIDE2OS40OCw3My4zMCAxNzMuMDAsNzYuMjgmIzEwOyAgICAgICAgICAgICAxNzQuNDcsNzcuNTMgMTc3LjE5LDgwLjIyIDE3OS4wMCw4MC42NiYjMTA7ICAgICAgICAgICAgIDE4Mi41Miw4MS41MyAxODkuNzUsNzQuMDYgMTkwLjgzLDcxLjAxJiMxMDsgICAgICAgICAgICAgMTkyLjQzLDY2LjUxIDE4MS4zNCw1OC44MyAxNzguMDAsNTYuNDMmIzEwOyAgICAgICAgICAgICAxNjIuODIsNDUuNTEgMTQyLjY3LDM1LjYzIDEyNC4wMCwzMy4wMCBaJiMxMDsgICAgICAgICAgIE0gMzIuMDAsOTguMDAmIzEwOyAgICAgICAgICAgQyAzMi4wMCw5OC4wMCA0NC4wMCwxMDkuMDAgNDQuMDAsMTA5LjAwJiMxMDsgICAgICAgICAgICAgNTIuOTIsMTAyLjY0IDU1Ljk5LDk4LjM5IDY3LjAwLDkzLjMxJiMxMDsgICAgICAgICAgICAgNjkuNjksOTIuMDcgNzkuODMsODguOTYgODAuOTcsODcuMzAmIzEwOyAgICAgICAgICAgICA4Mi4wNCw4NS43MyA4MC44OCw3MS40NCA3NC45NCw3MS42MSYjMTA7ICAgICAgICAgICAgIDY2LjQwLDcxLjg1IDQ3LjgyLDgyLjM4IDQxLjAwLDg3LjY2JiMxMDsgICAgICAgICAgICAgMzYuODcsOTAuODYgMzMuNTcsOTIuOTAgMzIuMDAsOTguMDAgWiYjMTA7ICAgICAgICAgICBNIDEyMS4wMCw3MS4wMCYjMTA7ICAgICAgICAgICBDIDEyMS4wMCw3MS4wMCAxMTcuMDAsODkuMDAgMTE3LjAwLDg5LjAwJiMxMDsgICAgICAgICAgICAgMTI2LjUzLDkwLjk0IDEzNC4wNSw5NC44NiAxNDIuMDAsMTAwLjM1JiMxMDsgICAgICAgICAgICAgMTQ0LjQ4LDEwMi4wNiAxNTAuNTcsMTA3LjgxIDE1My4wMCwxMDcuODAmIzEwOyAgICAgICAgICAgICAxNTYuMjMsMTA3LjgwIDE2My41NSw5OS40NSAxNjYuMDAsOTcuMDAmIzEwOyAgICAgICAgICAgICAxNTcuMTQsODQuODkgMTM1LjU4LDc0LjMyIDEyMS4wMCw3MS4wMCBaJiMxMDsgICAgICAgICAgIE0gNTguMDAsMTI0LjAwJiMxMDsgICAgICAgICAgIEMgNjAuODMsMTI2LjAyIDY3Ljk0LDEzMy4xNCA3MC4wMCwxMzMuNjYmIzEwOyAgICAgICAgICAgICA3Mi44NSwxMzQuMzkgNzUuNzYsMTMxLjM4IDc4LjAwLDEyOS45MSYjMTA7ICAgICAgICAgICAgIDgyLjA3LDEyNy4yNCA4NS4yMywxMjUuODcgOTAuMDAsMTI1LjAwJiMxMDsgICAgICAgICAgICAgOTAuMDAsMTI1LjAwIDg3LjAwLDEwNy4wMCA4Ny4wMCwxMDcuMDAmIzEwOyAgICAgICAgICAgICA3Ny40NywxMDguOTIgNjIuNTAsMTE0Ljk0IDU4LjAwLDEyNC4wMCBaJiMxMDsgICAgICAgICAgIE0gMTEyLjAwLDEwOC4wMCYjMTA7ICAgICAgICAgICBDIDExMi4wMCwxMDguMDAgMTA5LjAwLDEyNS4wMCAxMDkuMDAsMTI1LjAwJiMxMDsgICAgICAgICAgICAgMTEzLjU2LDEyNi41OSAxMTUuOTEsMTI3LjQ5IDEyMC4wMCwxMzAuMjImIzEwOyAgICAgICAgICAgICAxMjEuODUsMTMxLjQ1IDEyNC43MCwxMzMuOTUgMTI3LjAwLDEzMy44NCYjMTA7ICAgICAgICAgICAgIDEyOS45NywxMzMuNzEgMTM2Ljk1LDEyNi44MSAxMzcuNjYsMTI0LjAwJiMxMDsgICAgICAgICAgICAgMTM4LjA2LDEyMi40MiAxMzcuNTYsMTIxLjQyIDEzNi42MywxMjAuMTcmIzEwOyAgICAgICAgICAgICAxMzIuMzYsMTE0LjQ0IDExOS4xMiwxMDguNjUgMTEyLjAwLDEwOC4wMCBaJiMxMDsgICAgICAgICAgIE0gOTYuMDAsMTM1LjQ3JiMxMDsgICAgICAgICAgIEMgOTIuMDQsMTM2LjQ0IDg5LjMyLDEzNy4zNSA4Ni4zMywxNDAuMzMmIzEwOyAgICAgICAgICAgICA3My4zMiwxNTMuMjYgODUuMjMsMTc0Ljc0IDEwMy4wMCwxNzEuNTMmIzEwOyAgICAgICAgICAgICAxMTYuMTYsMTY5LjE1IDEyMy4yOSwxNTQuMjIgMTE1LjM1LDE0My4wMiYjMTA7ICAgICAgICAgICAgIDExMC42NiwxMzYuNDAgMTAzLjY5LDEzNC40MSA5Ni4wMCwxMzUuNDcgWiIvPgo8L3N2Zz4", predicate: function predicate() {
              return _this90._libwebphone.getUserAgent() && !_this90._libwebphone.getUserAgent().isReady();
            } }, { name: "idle", enabled: !0, rescale: .9, position: { mode: "center" }, source: "data:image/svg+xml;base64,PHN2ZyBpZD0idGVzdCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHg9IjAiIHk9IjAiIHdpZHRoPSIxNzUiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAxNzUgNDkiIGNsYXNzPSJsb2dvIj4KPHBhdGggY2xhc3M9ImxvZ29fX3N5bWJvbCIgc3R5bGU9ImZpbGw6ICNmZjU5MzM7IiBkPSJNNDIuMSAwLjZjLTAuOC0wLjgtMi0wLjgtMi43IDAgLTAuOCAwLjgtMC44IDIgMCAyLjggMC44IDAuOCAyIDAuOCAyLjcgMEM0Mi45IDIuNiA0Mi45IDEuMyA0Mi4xIDAuNnpNMTEuNyAzMy45bDIyLTIyLjFjLTAuNC0wLjUtMC44LTEtMS4zLTEuNSAtMC41LTAuNS0wLjktMC45LTEuNC0xLjNMOSAzMS4yYy0wLjggMC44LTAuOCAyIDAgMi44QzkuOCAzNC43IDExIDM0LjcgMTEuNyAzMy45ek0zOCA3LjVjMC44LTAuOCAwLjgtMiAwLTIuOCAtMC44LTAuOC0yLTAuOC0yLjcgMGwtMiAyQzI2IDAuNyAxNS4yIDEuMiA4LjQgOGMtNS4xIDUuMS02LjYgMTIuNC00LjYgMTguOGwtMy4zIDMuM2MtMC44IDAuOC0wLjggMiAwIDIuOCAwLjggMC44IDIgMC44IDIuNyAwbDE1LjktMTZjMC44LTAuOCAwLjgtMiAwLTIuOCAtMC44LTAuOC0yLTAuOC0yLjcgMEw4IDIyLjdjLTAuOS00LjggMC41LTkuOSA0LjItMTMuNSA1LjktNiAxNS41LTYgMjEuNSAwIDUuOSA2IDUuOSAxNS42IDAgMjEuNiAtMy4xIDMuMS03LjIgNC42LTExLjMgNC41TDE4IDM5LjZjNS45IDEuMiAxMi4yLTAuNSAxNi44LTUuMSA2LjgtNi44IDcuMi0xNy43IDEuMy0yNUwzOCA3LjV6TTIzLjQgMjguOWMtMC44LTAuOC0yLTAuOC0yLjcgMEwxMCAzOS42Yy0wLjggMC44LTAuOCAyIDAgMi44IDAuOCAwLjggMiAwLjggMi43IDBsMTAuNy0xMC43QzI0LjIgMzAuOSAyNC4yIDI5LjcgMjMuNCAyOC45ek0yNC44IDI0LjhjLTAuOCAwLjgtMC44IDIgMCAyLjggMC44IDAuOCAyIDAuOCAyLjcgMCAwLjgtMC44IDAuOC0yIDAtMi44QzI2LjggMjQgMjUuNiAyNCAyNC44IDI0Ljh6TTIzLjMgMTIuN2MwLjgtMC44IDAuOC0yIDAtMi44IC0wLjgtMC44LTItMC44LTIuNyAwIC0wLjggMC44LTAuOCAyIDAgMi44QzIxLjMgMTMuNSAyMi41IDEzLjUgMjMuMyAxMi43eiIvPgo8cGF0aCBjbGFzcz0ibG9nb19fd29yZG1hcmsiIHN0eWxlPSJmaWxsOiAjRkZGRkZGOyIgZD0iTTc5LjQgMTYuNmwzLjktMy45YzAuOC0wLjggMC44LTIgMC0yLjcgLTAuNC0wLjQtMC45LTAuNi0xLjQtMC42IC0wLjMgMC0wLjcgMC4xLTEgMC4zbC0wLjEgMC4xYy0wLjEgMC0wLjEgMC4xLTAuMiAwLjFMNzkuNSAxMWwtMC4xIDAuMUw3MS40IDE5Yy0wLjggMC45LTEuMyAxLjctMS43IDIuNiAtMC40IDAuOS0wLjcgMi0wLjcgMy4xIDAgMC4xIDAgMC4yIDAgMC4zIDAgMC4xIDAgMC4yIDAgMC4zIDAgNC45IDMuOSA4LjkgOC44IDguOSA0LjkgMCA4LjgtNCA4LjgtOC45Qzg2LjcgMjAuOSA4My41IDE3LjMgNzkuNCAxNi42ek03Ny45IDMwLjNjLTIuNyAwLTUtMi4yLTUtNSAwLTIuNyAyLjItNSA1LTUgMi43IDAgNSAyLjIgNSA1QzgyLjggMjggODAuNiAzMC4zIDc3LjkgMzAuM3pNOTkuNyA5LjNDOTIuOSA5LjMgODggMTQuOSA4OCAyMS43YzAgNi44IDQuOSAxMi40IDExLjcgMTIuNCA2LjggMCAxMS43LTUuNSAxMS43LTEyLjRTMTA2LjUgOS4zIDk5LjcgOS4zek05OS43IDMwLjJjLTQuNyAwLTcuOS0zLjgtNy45LTguNSAwLTQuNyAzLjItOC41IDcuOS04LjUgNC43IDAgNy45IDMuOCA3LjkgOC41QzEwNy42IDI2LjQgMTA0LjQgMzAuMiA5OS43IDMwLjJ6TTEyNC40IDkuM2MtNi44IDAtMTEuNyA1LjYtMTEuNyAxMi40IDAgNi44IDQuOSAxMi40IDExLjcgMTIuNCA2LjggMCAxMS43LTUuNSAxMS43LTEyLjRTMTMxLjIgOS4zIDEyNC40IDkuM3pNMTI0LjQgMzAuMmMtNC43IDAtNy45LTMuOC03LjktOC41IDAtNC43IDMuMi04LjUgNy45LTguNSA0LjcgMCA3LjkgMy44IDcuOSA4LjVDMTMyLjMgMjYuNCAxMjkuMSAzMC4yIDEyNC40IDMwLjJ6TTUzLjEgMzIuN2MwLjIgMC42IDAuOCAxLjQgMS45IDEuNCAwIDAgMTEuMSAwIDExLjEgMCAxLjEgMCAxLjktMC45IDEuOS0xLjkgMC0xLjEtMC45LTItMS45LTIgMCAwLTkuOCAwLTkuOCAwIC0wLjQtMy41IDIuMi01LjUgNC40LTUuN2wwLjktMC4xYzMuNy0wLjUgNi40LTMuNyA2LjQtNy41IDAtNC4yLTMuNC03LjYtNy42LTcuNiAtMy41IDAtNi40IDIuNC03LjMgNS42bDAgMGMwIDAuMS0wLjEgMC4zLTAuMSAwLjUgMCAxLjEgMC45IDEuOSAxLjkgMS45IDAuOSAwIDEuNy0wLjYgMS45LTEuNWwwLTAuMWMwLjUtMS41IDEuOS0yLjYgMy41LTIuNiAyIDAgMy43IDEuNyAzLjcgMy43IDAgMS45LTEuMyAzLjQtMy4xIDMuNmwtMC4zIDBjLTQuNyAwLjMtOC4zIDQuMy04LjMgOC42QzUyLjYgMjkuMiA1Mi41IDMwLjkgNTMuMSAzMi43eiIvPgo8cGF0aCBjbGFzcz0ibG9nb19fd29yZG1hcmsiIHN0eWxlPSJmaWxsOiAjRkZGRkZGOyIgZD0iTTE1My42IDkuM2MtMS4xIDAtMS45IDAuOS0xLjkgMS45djUuNWgtOS45di01LjVjMC0xLjEtMC45LTEuOS0xLjktMS45IC0xLjEgMC0xLjkgMC45LTEuOSAxLjl2MjAuOWMwIDEuMSAwLjkgMS45IDEuOSAxLjkgMS4xIDAgMS45LTAuOSAxLjktMS45VjIwLjZoOS45djExLjVjMCAxLjEgMC45IDEuOSAxLjkgMS45czEuOS0wLjkgMS45LTEuOVYxMS4zQzE1NS41IDEwLjIgMTU0LjYgOS4zIDE1My42IDkuM3pNMTczLjEgMzAuMmgtOUwxNzQuMiAyMGMwLjgtMC44IDAuOC0yIDAtMi43IC0wLjQtMC40LTAuOS0wLjYtMS40LTAuNiAwIDAgMCAwIDAgMGgtMTMuNWMtMS4xIDAtMS45IDAuOS0xLjkgMiAwIDEuMSAwLjkgMS45IDEuOSAxLjloOC45TDE1OCAzMC44Yy0wLjggMC44LTAuOCAyIDAgMi43IDAuMyAwLjMgMC43IDAuNSAxLjEgMC41IDAuMSAwIDAuMSAwIDAuMiAwIDAgMCAwIDAgMCAwaDEzLjdjMS4xIDAgMS45LTAuOSAxLjktMS45QzE3NSAzMS4xIDE3NC4xIDMwLjIgMTczLjEgMzAuMnoiLz4KPC9zdmc+", predicate: function predicate() {
              return !_this90._call || !_this90._call.hasSession();
            } }, { name: "ringing", enabled: !0, rescale: .5, position: { mode: "center" }, source: "data:image/svg+xml;base64,PHN2ZyBpZD0ic3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cGF0aCBkPSJNMTEuNSA2TDE2IDEuNSAxNC41IDAgMTAgNC41VjFIOHY3aDdWNnoiLz48cGF0aCBkPSJNMTIuOSAxMi40Yy0uMS0uMS0uMy0uMi0uMy0uMmwtMi45LTEtMS44IDEuMWMtLjEuMS0xLjUtLjItMi42LTEuNGwtLjMtLjNDMy43IDkuNCAzLjQgOC4yIDMuNSA4bDEuMy0xLjctMS0yLjlzLS4xLS4zLS4yLS4zYy0uMS0uMS0xLjUtLjMtMi4yLjRDLS41IDUuNC0xIDcuNCAzLjYgMTIuMWwuMy4zYzQuNyA0LjYgNi43IDQuMSA4LjYgMi4yLjctLjcuNS0yLjEuNC0yLjJ6Ii8+PC9zdmc+", predicate: function predicate() {
              return _this90._call && _this90._call.isRinging();
            } }, { name: "muted", enabled: !0, rescale: .5, position: { mode: "center" }, source: "data:image/svg+xml;base64,PHN2ZyBpZD0ic3ZnIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLDZsNC0ydjhsLTQtMnYyYzAsMC42LTAuNCwxLTEsMUg0bC0zLDNsLTEtMUwxNSwwbDEsMWwtNCw0VjZ6IE0xMCwzSDFDMC40LDMsMCwzLjUsMCw0djgmIzEwOyYjOTtjMCwwLjMsMC4xLDAuNSwwLjMsMC43TDEwLDN6Ii8+Cjwvc3ZnPg==", predicate: function predicate() {
              return _this90._call && _this90._call.isMuted();
            } }, { name: "held", enabled: !0, rescale: .5, position: { mode: "center" }, source: "data:image/svg+xml;base64,PHN2ZyBpZD0ic3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cGF0aCBkPSJNNSA1aDJ2Nkg1VjV6bTQgMGgydjZIOVY1eiIvPjxwYXRoIGQ9Ik04IDE2YzQuNCAwIDgtMy42IDgtOHMtMy42LTgtOC04LTggMy42LTggOCAzLjYgOCA4IDh6TTggMmMzLjMgMCA2IDIuNyA2IDZzLTIuNyA2LTYgNi02LTIuNy02LTYgMi43LTYgNi02eiIvPjwvc3ZnPg==", predicate: function predicate() {
              return _this90._call && _this90._call.isOnHold();
            } }, { name: "defaultAvatar", enabled: !0, rescale: .1, position: { mode: "center" }, source: "data:image/svg+xml;base64,PHN2ZyBpZD0ic3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cGF0aCBkPSJNMTIuNiA3Yy0xIDEuNS0yLjcgMi41LTQuNiAyLjVTNC40IDguNSAzLjQgN0MyLjkgNy4xIDAgOCAwIDEzYzAgMi43IDQgMyA4IDNzOC0uMyA4LTNjMC01LTIuOS01LjktMy40LTZ6Ii8+PGNpcmNsZSBjeD0iOCIgY3k9IjQiIHI9IjQiLz48L3N2Zz4=", predicate: function predicate() {
              return _this90._call && _this90._call.hasSession();
            }, arc: !0 }] };this._config = X.merge(t, e), this._canvasRender = null;
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this91 = this;

        this._libwebphone.on("videoCanvas.render.ready", function () {
          _this91._createCanvasRender(_this91._config.canvas);
        }), this._libwebphone.on("call.promoted", function (e, t) {
          _this91._callPromoted(t);
        }), this._libwebphone.on("call.primary.timeupdate", function (e, t, n, r, i) {
          _this91._callTimeupdate(t, i);
        }), this._libwebphone.on("call.primary.remote.video.playing", function (e, t, n) {
          _this91._setRemoteElement(n);
        }), this._libwebphone.on("call.primary.remote.video.timeupdate", function (e, t, n) {
          _this91._setRemoteElement(n);
        }), this._libwebphone.on("call.primary.local.video.playing", function (e, t, n) {
          _this91._setLocalElement(n);
        }), this._libwebphone.on("call.primary.local.video.timeupdate", function (e, t, n) {
          _this91._setLocalElement(n);
        }), this._libwebphone.on("videoCanvas.localVideo.enabled.changed", function () {
          _this91.updateRenders();
        }), this._libwebphone.on("videoCanvas.localVideo.rescale.changed", function () {
          _this91.updateRenders();
        }), this._libwebphone.on("videoCanvas.localVideo.position.changed", function () {
          _this91.updateRenders();
        }), this._libwebphone.on("videoCanvas.framesPerSecond.changed", function () {
          _this91.updateRenders();
        }), this._libwebphone.on("videoCanvas.fullscreen.start", function () {
          _this91.updateRenders();
        }), this._libwebphone.on("videoCanvas.fullscreen.stop", function () {
          _this91.updateRenders();
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this92 = this;

        this._config.renderTargets.map(function (e) {
          return _this92.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this93 = this;

        return { template: this._renderDefaultTemplate(), i18n: { localVideo: "libwebphone:videoCanvas.localVideo", remoteVideo: "libwebphone:videoCanvas.remoteVideo", video: "libwebphone:videoCanvas.video", show: "libwebphone:videoCanvas.show", hide: "libwebphone:videoCanvas.hide", rescale: "libwebphone:videoCanvas.rescale", position: "libwebphone:videoCanvas.position", x: "libwebphone:videoCanvas.x", y: "libwebphone:videoCanvas.y", center: "libwebphone:videoCanvas.center", topleft: "libwebphone:videoCanvas.topleft", topright: "libwebphone:videoCanvas.topright", bottomleft: "libwebphone:videoCanvas.bottomleft", bottomright: "libwebphone:videoCanvas.bottomright", absolute: "libwebphone:videoCanvas.absolute", relative: "libwebphone:videoCanvas.relative", framespersecond: "libwebphone:videoCanvas.framespersecond", fullscreen: "libwebphone:videoCanvas.fullscreen", startfullscreen: "libwebphone:videoCanvas.startfullscreen", stopfullscreen: "libwebphone:videoCanvas.stopfullscreen" }, data: X.merge({}, this._config, this._renderData()), by_id: { localVideoEnabled: { events: { onclick: function onclick() {
                  _this93.toggleImage(_this93._config.localVideo.name);
                } } }, localVideoRescale: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.rescaleImage(_this93._config.localVideo.name, t.value / 100);
                } } }, localVideoPosition: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.positionImage(_this93._config.localVideo.name, t.value);
                } } }, localVideoRelativeX: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.positionImage(_this93._config.localVideo.name, "relative", t.value / 100);
                } } }, localVideoRelativeY: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.positionImage(_this93._config.localVideo.name, "relative", null, t.value / 100);
                } } }, localVideoAbsoluteX: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.positionImage(_this93._config.localVideo.name, "absolute", t.value);
                } } }, localVideoAbsoluteY: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.positionImage(_this93._config.localVideo.name, "absolute", null, t.value / 100);
                } } }, canvasframesPerSecond: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this93.changeFramesPerSecond(t.value);
                } } } } };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n        {{#data.localVideo.show}}          \n          <div>\n            <label for="{{by_id.localVideoEnabled.elementId}}">\n                {{i18n.localVideo}}\n            </label>\n            <button id="{{by_id.localVideoEnabled.elementId}}">\n                {{^data.localVideo.enabled}}\n                    {{i18n.hide}}\n                {{/data.localVideo.enabled}}\n\n                {{#data.localVideo.enabled}}\n                    {{i18n.show}}\n                {{/data.localVideo.enabled}}\n            </button>\n          </div>\n\n          <div>\n            <label for="{{by_id.localVideoRescale.elementId}}">\n              {{i18n.rescale}}\n            </label>\n            <input type="range" min="1" max="100" value="{{data.localVideo.rescale}}" id="{{by_id.localVideoRescale.elementId}}">\n          </div>\n\n          <div>\n            <label for="{{by_id.localVideoPosition.elementId}}">\n              {{i18n.position}}\n            </label>\n            <select id="{{by_id.localVideoPosition.elementId}}">\n              <option value="center" {{#data.localVideo.position.center}}selected{{/data.localVideo.position.center}}>{{i18n.center}}</option>\n              <option value="top-left" {{#data.localVideo.position.topleft}}selected{{/data.localVideo.position.topleft}}>{{i18n.topleft}}</option>\n              <option value="top-right" {{#data.localVideo.position.topright}}selected{{/data.localVideo.position.topright}}>{{i18n.topright}}</option>\n              <option value="bottom-left" {{#data.localVideo.position.bottomleft}}selected{{/data.localVideo.position.bottomleft}}>{{i18n.bottomleft}}</option>\n              <option value="bottom-right" {{#data.localVideo.position.bottomright}}selected{{/data.localVideo.position.bottomright}}>{{i18n.bottomright}}</option>\n              <option value="relative" {{#data.localVideo.position.relative}}selected{{/data.localVideo.position.relative}}>{{i18n.relative}}</option>\n              <option value="absolute" {{#data.localVideo.position.absolute}}selected{{/data.localVideo.position.absolute}}>{{i18n.absolute}}</option>\n            </select>\n          </div>\n\n          {{#data.localVideo.position.relative}}\n            <div>\n              <label for="{{by_id.localVideoRelativeX.elementId}}">\n                {{i18n.x}}\n              </label>\n              <input type="range" min="0" max="{{data.localVideo.position.maximumX}}" value="{{data.localVideo.position.relativeX}}" id="{{by_id.localVideoRelativeX.elementId}}">\n            </div>\n\n            <div>\n              <label for="{{by_id.localVideoRelativeY.elementId}}">\n                {{i18n.y}}\n              </label>\n              <input type="range" min="0" max="{{data.localVideo.position.maximumY}}" value="{{data.localVideo.position.relativeY}}" id="{{by_id.localVideoRelativeY.elementId}}">\n            </div>\n          {{/data.localVideo.position.relative}}\n\n\n          {{#data.localVideo.position.absolute}}\n            <div>\n              <label for="{{by_id.localVideoAbsoluteX.elementId}}">\n                {{i18n.x}}\n              </label>\n              <input type="range" min="0" max="{{data.localVideo.position.maximumX}}" value="{{data.localVideo.position.absoluteX}}" id="{{by_id.localVideoAbsoluteX.elementId}}">\n            </div>\n\n            <div>\n              <label for="{{by_id.localVideoAbsoluteY.elementId}}">\n                {{i18n.y}}\n              </label>\n              <input type="range" min="0" max="{{data.localVideo.position.maximumY}}" value="{{data.localVideo.position.absoluteX}}" id="{{by_id.localVideoAbsoluteY.elementId}}">\n            </div>\n          {{/data.localVideo.position.absolute}}\n\n        {{/data.localVideo.show}}\n\n        {{#data.canvasLoop.show}}\n          <div>\n            <label for="{{by_id.canvasframesPerSecond.elementId}}">\n              {{i18n.framespersecond}}\n            </label>\n            <input type="range" min="1" max="30" value="{{data.canvasLoop.framesPerSecond}}" id="{{by_id.canvasframesPerSecond.elementId}}">\n          </div>\n        {{/data.canvasLoop.show}}\n\n        {{#data.fullscreen.supported}}\n        {{#data.fullscreen.show}}\n          <div>\n            <label for="{{by_id.fullscreen.elementId}}">\n                {{i18n.fullscreen}}\n            </label>\n            <button id="{{by_id.fullscreen.elementId}}">\n                {{^data.isFullScreen}}\n                    {{i18n.startfullscreen}}\n                {{/data.isFullScreen}}\n\n                {{#data.isFullScreen}}\n                    {{i18n.stopfullscreen}}\n                {{/data.isFullScreen}}\n            </button>\n          </div>\n        {{/data.fullscreen.show}}\n        {{/data.fullscreen.supported}}\n    ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { localVideo: {}, remoteVideo: {}, canvasLoop: {} };
        var t = this._canvasGetImage(this._canvasRender, this._config.localVideo.name);return t || (t = {}), t.position || (t.position = this._config.localVideo.position), e.localVideo.position = { mode: t.position.mode, center: "center" == t.position.mode, topleft: "top-left" == t.position.mode, topright: "top-right" == t.position.mode, bottomleft: "bottom-left" == t.position.mode, bottomright: "bottom-right" == t.position.mode, relative: "relative" == t.position.mode, absolute: "absolute" == t.position.mode, maximumX: 0, maximumY: 0 }, e.localVideo.position.relative ? (e.localVideo.position.relativeX = 100 * (t.position.x || 0), e.localVideo.position.relativeY = 100 * (t.position.y || 0), e.localVideo.position.maximumX = 100, e.localVideo.position.maximumY = 100) : e.localVideo.position.absolute && (e.localVideo.position.absoluteX = t.position.x || 0, e.localVideo.position.absoluteY = t.position.y || 0, this._canvasRender.element && (e.localVideo.position.maximumX = this._canvasRender.element.width, e.localVideo.position.maximumY = this._canvasRender.element.height)), e.localVideo.rescale = 100 * this._config.localVideo.rescale, e.canvasLoop.framesPerSecond = this._config.canvasLoop.framesPerSecond, e;
      }
    }, {
      key: "_configGetImage",
      value: function _configGetImage(e) {
        switch (e) {case this._config.localVideo.name:
            return this._config.localVideo;case this._config.remoteVideo.name:
            return this._config.remoteVideo;default:
            return this._config.images.find(function (t) {
              return t.name == e;
            });}
      }
    }, {
      key: "_callPromoted",
      value: function _callPromoted() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        if (this._call = e, this._setCanvasImage(this._canvasRender, this._config.localVideo.name), this._setCanvasImage(this._canvasRender, this._config.remoteVideo.name), e._statusLines || (e._statusLines = []), e && e.hasSession()) {
          var t = e._statusLines.find(function (e) {
            return "remoteIdentity" == e.type;
          });if (t) t.text = e.remoteIdentity();else {
            var _t24 = this._canvasRender;if (!_t24) return;e._statusLines.push(this._createStatusLine(_t24, { text: e.remoteIdentity(), type: "remoteIdentity" }));
          }
        }this.updateRenders();
      }
    }, {
      key: "_callTimeupdate",
      value: function _callTimeupdate(e, t) {
        e._statusLines || (e._statusLines = []);var n = e._statusLines.find(function (e) {
          return "duration" == e.type;
        });if (n) n.text = t;else {
          var _n30 = this._canvasRender;if (!_n30) return;e._statusLines.push(this._createStatusLine(_n30, { text: t, type: "duration" }));
        }
      }
    }, {
      key: "_setRemoteElement",
      value: function _setRemoteElement() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = this._config.remoteVideo.name;this._setElement(t, e, this._config.remoteVideo);
      }
    }, {
      key: "_setLocalElement",
      value: function _setLocalElement() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = this._config.localVideo.name;this._setElement(t, e, this._config.localVideo);
      }
    }, {
      key: "_setElement",
      value: function _setElement(e) {
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        var r = this._canvasRender;t ? this._checkCanvasImage(r, e, t, n) : this._setCanvasImage(r, e);
      }
    }, {
      key: "_setCanvasImage",
      value: function _setCanvasImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var r = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        if (!e) return;var i = e.data.images.findIndex(function (e) {
          return e.name == t;
        });if (-1 != i && e.data.images.splice(i, 1), !n) return;var o = e.root.element.width,
            s = e.root.element.height,
            a = r.sourceWidth || n.videoWidth || n.width || o,
            l = r.sourceHeight || n.videoHeight || n.height || s,
            u = Math.min(o / a, s / l),
            c = a * u,
            d = l * u,
            h = { enabled: !0, source: { stream: n, x: 0, y: 0, width: a, height: l }, position: { mode: "center", x: null, y: null }, destination: { original: { scale: u, x: o / 2 - c / 2, y: s / 2 - d / 2, width: c, height: d } } };return h.name = t, h.destination.current = X.merge({}, h.destination.original), r.rescale && this._rescaleCanvasImage(e, h, r.rescale), r.position && this._positionCanvasImage(e, h, r.position.mode, r.position.x, r.position.y), r.averageRGB && this._averageCanvasImageRGB(e, h, r.averageRGB), r.predicate ? h.predicate = r.predicate : h.predicate = function () {
          return !1;
        }, r.arc && (h.arc = !0), e.data.images.push(h), this.updateRenders(), h;
      }
    }, {
      key: "_checkCanvasImage",
      value: function _checkCanvasImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var r = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        if (!e) return;var i = this._canvasGetImage(e, t);if (!i) return this._setCanvasImage(e, t, n, r);var o = !1;var s = e.root.element.width,
            a = e.root.element.height,
            l = r.sourceWidth || n.videoWidth || n.width || s,
            u = r.sourceHeight || n.videoHeight || n.height || a,
            c = Math.min(s / l, a / u);return i.source.width != l && (i.source.width = l, o = !0), i.source.height != u && (i.source.height = u, o = !0), (o || i.destination.original.scale != c) && (i.destination.original.scale = c, i.destination.original.x = s / 2 - i.source.width / 2 * c, i.destination.original.width = i.source.width * c, i.destination.original.y = a / 2 - i.source.height / 2 * c, i.destination.original.height = i.source.height * c, o = !0), o && this._rescaleCanvasImage(e, i), i.averageRGB && this._averageCanvasImageRGB(e, i), i;
      }
    }, {
      key: "_rescaleCanvasImage",
      value: function _rescaleCanvasImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        if (e && t) return n && (t.destination.current.scale = n), t.destination.current.width = t.destination.original.width * t.destination.current.scale, t.destination.current.height = t.destination.original.height * t.destination.current.scale, this._positionCanvasImage(e, t);
      }
    }, {
      key: "_positionCanvasImage",
      value: function _positionCanvasImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var r = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var i = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
        if (!e || !t) return;var o = e.root.element.width,
            s = e.root.element.height;switch (t.position || (t.position = {}), n && (t.position.mode = n), t.position.mode) {case "delta":
            t.position.x = t.destination.current.x, t.position.y = t.destination.current.y, null !== r && (t.position.x += r), null !== i && (t.position.y += i), t.position.mode = "absolute";break;case "absolute":
            t.position.x = t.destination.current.x, t.position.y = t.destination.current.y, null !== r && (t.position.x = r), null !== i && (t.position.y = i);break;case "relative":
            t.position.x = (t.destination.current.x + t.destination.current.width / 2) / o, t.position.y = (t.destination.current.y + t.destination.current.height / 2) / s, null !== r && (t.position.x = r), null !== i && (t.position.y = i);}switch (t.position.mode) {case "absolute":
            t.destination.current.x = t.position.x, t.destination.current.y = t.position.y;break;case "relative":
            t.destination.current.x = o * t.position.x - t.destination.current.width / 2, t.destination.current.y = s * t.position.y - t.destination.current.height / 2;break;case "top-left":
            t.destination.current.x = 0, t.destination.current.y = 0;break;case "top-right":
            t.destination.current.x = o - t.destination.current.width, t.destination.current.y = 0;break;case "bottom-left":
            t.destination.current.x = 0, t.destination.current.y = s - t.destination.current.height;break;case "bottom-right":
            t.destination.current.x = o - t.destination.current.width, t.destination.current.y = s - t.destination.current.height;break;case "center":default:
            t.position.mode = "center", t.destination.current.x = o / 2 - t.destination.current.width / 2, t.destination.current.y = s / 2 - t.destination.current.height / 2;}return this._constrainCanvasImage(e, t);
      }
    }, {
      key: "_constrainCanvasImage",
      value: function _constrainCanvasImage(e, t) {
        if (!e || !t) return;var n = t.destination.current.x,
            r = t.destination.current.x + t.destination.current.width,
            i = t.destination.current.y,
            o = t.destination.current.y + t.destination.current.height,
            s = e.root.element.width,
            a = e.root.element.height;return n < 0 ? t.destination.current.x = 0 : r > s && (t.destination.current.x = s - t.destination.current.width), i < 0 ? t.destination.current.y = 0 : o > a && (t.destination.current.y = a - t.destination.current.height), this.updateRenders(), t;
      }
    }, {
      key: "_averageCanvasImageRGB",
      value: function _averageCanvasImageRGB(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        if (!t) return;t.averageRGB || (t.averageRGB = { canvas: document.createElement("canvas"), red: 0, green: 0, blue: 0, distance: 0, threshold: 0 }), t.averageRGB.context || (t.averageRGB.context = t.averageRGB.canvas.getContext("2d")), t.averageRGB.context.drawImage(t.source.stream, 0, 0);var r = t.averageRGB.context.getImageData(0, 0, t.averageRGB.canvas.width, t.averageRGB.canvas.height);t.averageRGB.red = 0, t.averageRGB.green = 0, t.averageRGB.blue = 0;for (var _o3 = 0; _o3 < r.data.length; _o3 += 40) {
          t.averageRGB.red += r.data[_o3], t.averageRGB.green += r.data[_o3 + 1], t.averageRGB.blue += r.data[_o3 + 2];
        }var i = r.data.length / 40;return t.averageRGB.red = ~~(t.averageRGB.red / i), t.averageRGB.green = ~~(t.averageRGB.green / i), t.averageRGB.blue = ~~(t.averageRGB.blue / i), t.averageRGB.distance = Math.abs(t.averageRGB.red - t.averageRGB.green) + Math.abs(t.averageRGB.red - t.averageRGB.blue) + Math.abs(t.averageRGB.green - t.averageRGB.blue), n.threshold && (t.averageRGB.threshold = n.threshold), t;
      }
    }, {
      key: "_createStatusLine",
      value: function _createStatusLine(e, t) {
        var n = { font: "14px sans-serif", fillStyle: "#ffffff", textAlign: "left", textBaseline: "top", type: "undefined", x: e.root.element.width / 2, y: e.root.element.height / 2 };return (t = X.merge(n, t)).canvas || (t.canvas = document.createElement("canvas")), t.context || (t.context = t.canvas.getContext("2d")), t.measurements = t.context.measureText(t.text), t.expectedHeight = (t.measurements.actualBoundingBoxAscent || 12) + (t.measurements.actualBoundingBoxDescent || 12), t;
      }
    }, {
      key: "_createCanvasRender",
      value: function _createCanvasRender(e) {
        var _this94 = this;

        var t = X.merge({ root: { elementId: null, element: null }, context: null, data: { images: [], strings: [], fills: { background: "#2e2e32", avatar: "#909099" }, strokes: { debug: "white" } }, timer: null, framesPerSecond: null }, e);!t.root.element && t.root.elementId && (t.root.element = document.getElementById(t.root.elementId)), t.root.element || (t.root.element = document.createElement("canvas"), t.root.element.width = this._config.canvas.defaultWidth, t.root.element.height = this._config.canvas.defaultHeight), !t.context && t.root.element && (t.context = t.root.element.getContext("2d")), this._config.images.forEach(function (e) {
          var n = document.createElement("img");n.onload = function () {
            _this94._setCanvasImage(t, e.name, n, e);
          }, e.source && (n.src = e.source);
        }), this._dialpadStatusLine = this._createStatusLine(t, { text: "", type: "dialpadTarget" }), t.framesPerSecond = this._config.canvasLoop.framesPerSecond, t.timer = setInterval(function () {
          _this94._renderCanvas(t);
        }, 1e3 / t.framesPerSecond), this._canvasRender = t;
      }
    }, {
      key: "_renderCanvas",
      value: function _renderCanvas(e) {
        var _this95 = this;

        var t = 0,
            n = 0;var r = e.root.element.width,
            i = e.root.element.height;if (e.context.fillStyle = e.data.fills.background, e.context.fillRect(0, 0, r, i), e.debug && (e.context.beginPath(), e.context.moveTo(r / 2, 0), e.context.lineTo(r / 2, i), e.context.strokeStyle = e.data.strokes.debug, e.context.stroke(), e.context.beginPath(), e.context.moveTo(0, i / 2), e.context.lineTo(r, i / 2), e.context.strokeStyle = e.data.strokes.debug, e.context.stroke()), this._config.remoteVideo.enabled && this._canvasHasImage(e, this._config.remoteVideo.name, { checkShouldShow: !0 })) return this._renderCanvasImage(e, this._canvasGetImage(e, this._config.remoteVideo.name)), void (this._config.localVideo.enabled && this._renderCanvasImage(e, this._canvasGetImage(e, this._config.localVideo.name, { checkShouldShow: !0 })));var o = this._canvasRender.data.images.find(function (e) {
          return e.predicate() && e.enabled && e.source.stream;
        });if (o) if (o.arc) {
          var _r21 = Math.hypot(o.destination.current.width, o.destination.current.height);t += _r21, n = i / 2 - t / 2, e.context.beginPath(), e.context.fillStyle = e.data.fills.avatar, e.context.arc(o.destination.current.x + o.destination.current.width / 2, n + o.destination.current.height / 2, _r21 / 2, 0, 2 * Math.PI), e.context.fill(), this._renderCanvasImage(e, o, n), n += _r21;
        } else t += o.destination.current.height, n = i / 2 - t / 2, n += this._renderCanvasImage(e, o, n);[].forEach(function (t) {
          n += 15, _this95._renderStatusLine(e, t, n), n += t.expectedHeight;
        });
      }
    }, {
      key: "_canvasGetImage",
      value: function _canvasGetImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { checkShouldShow: !1 };
        if (!e) return;var r = e.data.images.find(function (e) {
          return e.name == t;
        });return !r || n.checkShouldShow && (!r.enabled || !r.source || r.averageRGB && r.averageRGB.distance <= r.averageRGB.threshold) ? void 0 : r;
      }
    }, {
      key: "_canvasHasImage",
      value: function _canvasHasImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        return !!this._canvasGetImage(e, t, n);
      }
    }, {
      key: "_renderCanvasImage",
      value: function _renderCanvasImage(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var r = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        return e && t ? (r && (t.destination.current.x = r), n && (t.destination.current.y = n), e.context.drawImage(t.source.stream, t.source.x, t.source.y, t.source.width, t.source.height, t.destination.current.x, t.destination.current.y, t.destination.current.width, t.destination.current.height), e.debug && (e.context.beginPath(), e.context.strokeStyle = e.data.strokes.debug, e.context.strokeRect(t.destination.current.x, t.destination.current.y, t.destination.current.width, t.destination.current.height), e.context.stroke()), t.destination.current.height) : 0;
      }
    }, {
      key: "_renderStatusLine",
      value: function _renderStatusLine(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var r = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        e && t && (r || (r = t.x), n || (n = t.y), t.measurements = e.context.measureText(t.text), e.context.font = t.font, e.context.fillStyle = t.fillStyle, e.context.textAlign = t.textAlign, e.context.textBaseline = t.textBaseline, e.context.fillText(t.text, r - t.measurements.width / 2, n));
      }
    }]);
    return gt;
  }(re),
      _t = function (_re7) {
    (0, _inherits3.default)(_t, _re7);

    function _t(e) {
      var _this96, _ret7;

      var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      (0, _classCallCheck3.default)(this, _t);
      return _ret7 = ((_this96 = (0, _possibleConstructorReturn3.default)(this, (_t.__proto__ || Object.getPrototypeOf(_t)).call(this, e)), _this96), _this96._libwebphone = e, _this96._emit = _this96._libwebphone._audioContextEvent, _this96._initProperties(t), _this96._initInternationalization(t.i18n || {}), _this96._initOutputAudio(), _this96._initRingAudio(), _this96._initTonesAudio(), _this96._initPreviewAudio(), _this96._initRemoteAudio(), _this96._initEventBindings(), _this96._initRenderTargets(), _this96._emit("created", _this96), _this96), (0, _possibleConstructorReturn3.default)(_this96, _ret7);
    }

    (0, _createClass3.default)(_t, [{
      key: "startAudioContext",
      value: function startAudioContext() {
        this._started || (this._audioContext.resume(), this._ringerAudio.carrierNode.start(), this._ringerAudio.modulatorNode.start(), this._previewAudio.oscillatorNode.start(), this._started = !0, this._emit("started", this));
      }
    }, {
      key: "startPreviewTone",
      value: function startPreviewTone() {
        this.isPreviewToneActive() || (this.startAudioContext(), this._previewAudio.toneActive = !0, this._previewAudio.oscillatorNode.connect(this._getOutputGainNode("preview")), this._emit("preview.tone.started", this));
      }
    }, {
      key: "stopPreviewTone",
      value: function stopPreviewTone() {
        this.isPreviewToneActive() && (this._previewAudio.toneActive = !1, this._previewAudio.oscillatorNode.disconnect(), this._emit("preview.tone.stopped", this));
      }
    }, {
      key: "togglePreviewTone",
      value: function togglePreviewTone() {
        this.isPreviewToneActive() ? this.stopPreviewTone() : this.startPreviewTone();
      }
    }, {
      key: "isPreviewToneActive",
      value: function isPreviewToneActive() {
        return this._previewAudio.toneActive;
      }
    }, {
      key: "startPreviewLoopback",
      value: function startPreviewLoopback() {
        this.isPreviewLoopbackActive() || (this.startAudioContext(), this._previewAudio.loopbackActive = !0, this._previewAudio.loopbackDelayNode.connect(this._getOutputGainNode("preview")), this._emit("preview.loopback.started", this));
      }
    }, {
      key: "stopPreviewLoopback",
      value: function stopPreviewLoopback() {
        this.isPreviewLoopbackActive() && (this._previewAudio.loopbackActive = !1, this._previewAudio.loopbackDelayNode.disconnect(), this._emit("preview.loopback.stopped", this));
      }
    }, {
      key: "togglePreviewLoopback",
      value: function togglePreviewLoopback() {
        this.isPreviewLoopbackActive() ? this.stopPreviewLoopback() : this.startPreviewLoopback();
      }
    }, {
      key: "isPreviewLoopbackActive",
      value: function isPreviewLoopbackActive() {
        return this._previewAudio.loopbackActive;
      }
    }, {
      key: "stopPreviews",
      value: function stopPreviews() {
        this.stopPreviewTone(), this.stopPreviewLoopback();
      }
    }, {
      key: "getVolume",
      value: function getVolume(e) {
        var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { scale: !0, relativeToMaster: !1 };
        var n = 0;return this._config.channels[e] && (n = this._config.channels[e].volume), t.relativeToMaster && (n *= this._config.channels.master.volume), t.scale && (n *= this._config.volumeMax), n;
      }
    }, {
      key: "changeVolume",
      value: function changeVolume(e, t) {
        var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        var r = this._getOutputGainNode(e);this.startAudioContext(), Object.prototype.hasOwnProperty.call(n, "scale") || (n.scale = t > 1), n.scale && (t /= this._config.volumeMax), t < 0 && (t = 0), t > 1 && (t = 1), this._config.channels[e] && (this._config.channels[e].volume = t, this._emit("channel." + e + ".volume", this, t)), r && (r.gain.value = t);
      }
    }, {
      key: "playTones",
      value: function playTones() {
        for (var _len30 = arguments.length, e = Array(_len30), _key30 = 0; _key30 < _len30; _key30++) {
          e[_key30] = arguments[_key30];
        }

        if (!e.length) return;this.startAudioContext();var t = this._config.channels.tones.duration,
            n = this._tonesAudio.context.sampleRate,
            r = this._shimCreateBuffer(this._tonesAudio.context, e.length, n, n);for (var _o4 = 0; _o4 < e.length; _o4++) {
          var _i8 = r.getChannelData(_o4);for (var _r22 = 0; _r22 < t * n; _r22++) {
            _i8[_r22] = Math.sin(2 * Math.PI * e[_o4] * (_r22 / n));
          }
        }var i = this._shimCreateBufferSource(this._tonesAudio.context);i.buffer = r, i.connect(this._getOutputGainNode("tones")), i.start(), setTimeout(function () {
          i.disconnect(), i.stop();
        }, 1e3 * (t + .5));
      }
    }, {
      key: "startRinging",
      value: function startRinging() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        this.startAudioContext(), e ? this._ringerAudio.calls.includes(e) || this._ringerAudio.calls.push(e) : this._ringerAudio.calls.push(null), this._ringerAudio.ringerConnected || (this._ringerAudio.ringerConnected = !0, this._ringerAudio.ringerGain.connect(this._getOutputGainNode("ringer"))), this._ringingTimer || this._ringTimer();
      }
    }, {
      key: "stopRinging",
      value: function stopRinging() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        e || (e = null);var t = this._ringerAudio.calls.indexOf(e);-1 != t && this._ringerAudio.calls.splice(t, 1), 0 == this._ringerAudio.calls.length && this.stopAllRinging();
      }
    }, {
      key: "stopAllRinging",
      value: function stopAllRinging() {
        this._ringerAudio.ringerConnected && (this._ringerAudio.ringerConnected = !1, this._ringerAudio.ringerGain.disconnect()), this._ringerAudio.calls = [], this._ringerMute();
      }
    }, {
      key: "getDestinationStream",
      value: function getDestinationStream() {
        return this._outputAudio.destinationStream.stream;
      }
    }, {
      key: "updateRenders",
      value: function updateRenders() {
        var _this97 = this;

        this.render(function (e) {
          return e.data = _this97._renderData(e.data), e;
        });
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var t = X.merge({ en: { mastervolume: "Master Volume", ringervolume: "Ringer Volume", tonesvolume: "Tones Volume", previewvolume: "Preview Volume", remotevolume: "Call Volume" } }, e.resourceBundles || {});this._libwebphone.i18nAddResourceBundles("audioContext", t);
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        var _this98 = this;

        var t = { channels: { master: { show: !0, volume: 1 }, ringer: { onTime: 1.5, offTime: 1, carrier: { frequency: 440 }, modulator: { frequency: 10, amplitude: .75 }, show: !0, volume: 1, connectToMaster: !0 }, tones: { duration: .15, show: !0, volume: .15, connectToMaster: !0 }, remote: { show: !0, volume: 1, connectToMaster: !1 }, preview: { loopback: { delay: .5 }, tone: { frequency: 440, duration: 1.5, type: "sine" }, show: !0, volume: 1, connectToMaster: !0 } }, globalKeyShortcuts: !0, keys: { arrowup: { enabled: !0, action: function action() {
                _this98.changeVolume("master", _this98._config.channels.master.volume + .05, { scale: !1 });
              } }, arrowdown: { enabled: !0, action: function action() {
                _this98.changeVolume("master", _this98._config.channels.master.volume - .05, { scale: !1 });
              } } }, renderTargets: [], volumeMax: 100, volumeMin: 0 };this._config = X.merge(t, e), this._audioContext = this._shimAudioContext(), this._ringingTimer = null;
      }
    }, {
      key: "_initOutputAudio",
      value: function _initOutputAudio() {
        var e = this._libwebphone.getMediaDevices();this._outputAudio = {}, this._outputAudio.context = this._audioContext, this._outputAudio.masterGain = this._shimCreateGain(this._outputAudio.context), this._outputAudio.masterGain.gain.value = this._config.channels.master.volume, this._outputAudio.ringerGain = this._shimCreateGain(this._outputAudio.context), this._outputAudio.ringerGain.gain.value = this._config.channels.ringer.volume, this._config.channels.ringer.connectToMaster && this._outputAudio.ringerGain.connect(this._outputAudio.masterGain), this._outputAudio.tonesGain = this._shimCreateGain(this._outputAudio.context), this._outputAudio.tonesGain.gain.value = this._config.channels.tones.volume, this._config.channels.tones.connectToMaster && this._outputAudio.tonesGain.connect(this._outputAudio.masterGain), this._outputAudio.remoteGain = this._shimCreateGain(this._outputAudio.context), this._outputAudio.remoteGain.gain.value = this._config.channels.remote.volume, this._config.channels.remote.connectToMaster && this._libwebphone._config.call.useAudioContext && this._outputAudio.remoteGain.connect(this._outputAudio.masterGain), this._outputAudio.previewGain = this._shimCreateGain(this._outputAudio.context), this._outputAudio.previewGain.gain.value = this._config.channels.preview.volume, this._config.channels.preview.connectToMaster && this._outputAudio.previewGain.connect(this._outputAudio.masterGain), this._outputAudio.destinationStream = this._shimCreateMediaStreamDestination(this._outputAudio.context), this._outputAudio.masterGain.connect(this._outputAudio.destinationStream), e && e.getMediaElement("audiooutput") ? (e.getMediaElement("audiooutput").srcObject = this._outputAudio.destinationStream.stream, this._outputAudio.usingAudioElement = !0) : (this._outputAudio.masterGain.connect(this._outputAudio.context.destination), this._outputAudio.usingAudioElement = !1);
      }
    }, {
      key: "_initRingAudio",
      value: function _initRingAudio() {
        this._ringerAudio = {}, this._ringerAudio.context = this._audioContext, this._ringerAudio.calls = [], this._ringerAudio.ringerConnected = !1, this._ringerAudio.carrierGain = this._shimCreateGain(this._ringerAudio.context), this._ringerAudio.carrierNode = this._shimCreateOscillator(this._ringerAudio.context), this._ringerAudio.carrierNode.frequency.value = this._config.channels.ringer.carrier.frequency, this._ringerAudio.carrierNode.connect(this._ringerAudio.carrierGain), this._ringerAudio.modulatorNode = this._shimCreateOscillator(this._ringerAudio.context), this._ringerAudio.modulatorNode.frequency.value = this._config.channels.ringer.modulator.frequency, this._ringerAudio.modulatorNode.connect(this._ringerAudio.carrierGain.gain), this._ringerAudio.ringerGain = this._shimCreateGain(this._ringerAudio.context), this._ringerAudio.carrierGain.connect(this._ringerAudio.ringerGain);
      }
    }, {
      key: "_initTonesAudio",
      value: function _initTonesAudio() {
        this._tonesAudio = {}, this._tonesAudio.context = this._audioContext;
      }
    }, {
      key: "_initRemoteAudio",
      value: function _initRemoteAudio() {
        this._remoteAudio = {}, this._remoteAudio.context = this._audioContext, this._remoteAudio.sourceStream = null;
      }
    }, {
      key: "_initPreviewAudio",
      value: function _initPreviewAudio() {
        this._previewAudio = {}, this._previewAudio.context = this._audioContext, this._previewAudio.sourceStream = null, this._previewAudio.toneActive = !1, this._previewAudio.oscillatorNode = this._shimCreateOscillator(this._previewAudio.context), this._previewAudio.oscillatorNode.frequency.value = this._config.channels.preview.tone.frequency, this._previewAudio.oscillatorNode.type = this._config.channels.preview.tone.type, this._previewAudio.loopbackActive = !1, this._previewAudio.loopbackDelayNode = this._shimCreateDelay(this._previewAudio.context, this._config.channels.preview.loopback.delay + 1.5), this._previewAudio.loopbackDelayNode.delayTime.value = this._config.channels.preview.loopback.delay;
      }
    }, {
      key: "_initEventBindings",
      value: function _initEventBindings() {
        var _this99 = this;

        this._libwebphone.on("call.ringing.started", function (e, t) {
          _this99.startRinging(t.getId());
        }), this._libwebphone.on("call.ringing.stopped", function (e, t) {
          _this99.stopRinging(t.getId());
        }), this._libwebphone.on("call.primary.remote.audio.added", function (e, t, n) {
          _this99._createRemoteSourceStream(n.mediaStream);
        }), this._libwebphone.on("call.primary.remote.mediaStream.connect", function (e, t, n) {
          _this99._createRemoteSourceStream(n);
        }), this._libwebphone.on("dialpad.tones.play", function (e, t, n) {
          _this99.playTones.apply(_this99, n);
        }), this._libwebphone.on("mediaDevices.streams.started", function (e, t, n) {
          _this99._createLocalSourceStream(n);
        }), this._libwebphone.on("mediaDevices.streams.stopped", function () {
          _this99._connectLocalSourceStream();
        }), this._libwebphone.on("mediaDevices.audio.input.changed", function (e, t, n) {
          _this99._createLocalSourceStream(n.mediaStream);
        }), this._config.globalKeyShortcuts && document.addEventListener("keydown", function (e) {
          if (e.target == document.body) switch (e.key) {case "ArrowUp":
              _this99._config.keys.arrowup.enabled && _this99._config.keys.arrowup.action(e, _this99);break;case "ArrowDown":
              _this99._config.keys.arrowdown.enabled && _this99._config.keys.arrowdown.action(e, _this99);}
        }), this._libwebphone.on("audioContext.channel.master.volume", function () {
          _this99.updateRenders();
        }), this._libwebphone.on("audioContext.channel.ringer.volume", function () {
          _this99.updateRenders();
        }), this._libwebphone.on("audioContext.channel.tones.volume", function () {
          _this99.updateRenders();
        }), this._libwebphone.on("audioContext.channel.preview.volume", function () {
          _this99.updateRenders();
        }), this._libwebphone.on("audioContext.channel.remote.volume", function () {
          _this99.updateRenders();
        });
      }
    }, {
      key: "_initRenderTargets",
      value: function _initRenderTargets() {
        var _this100 = this;

        this._config.renderTargets.map(function (e) {
          return _this100.renderAddTarget(e);
        });
      }
    }, {
      key: "_renderDefaultConfig",
      value: function _renderDefaultConfig() {
        var _this101 = this;

        return { template: this._renderDefaultTemplate(), i18n: { mastervolume: "libwebphone:audioContext.mastervolume", ringervolume: "libwebphone:audioContext.ringervolume", tonesvolume: "libwebphone:audioContext.tonesvolume", previewvolume: "libwebphone:audioContext.previewvolume", remotevolume: "libwebphone:audioContext.remotevolume" }, by_id: { mastervolume: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this101.changeVolume("master", t.value);
                } } }, ringervolume: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this101.changeVolume("ringer", t.value);
                } } }, tonesvolume: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this101.changeVolume("tones", t.value);
                } } }, previewvolume: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this101.changeVolume("preview", t.value);
                } } }, remotevolume: { events: { onchange: function onchange(e) {
                  var t = e.srcElement;_this101.changeVolume("remote", t.value);
                } } } }, data: X.merge({}, this._config, this._renderData()) };
      }
    }, {
      key: "_renderDefaultTemplate",
      value: function _renderDefaultTemplate() {
        return '\n        <div>\n          {{#data.channels.master.show}}\n            <div>\n              <label for="{{by_id.mastervolume.elementId}}">\n                {{i18n.mastervolume}}\n              </label>\n              <input type="range" min="{{data.volume.min}}" max="{{data.volume.max}}" value="{{data.volumes.master}}" id="{{by_id.mastervolume.elementId}}">\n            </div>\n          {{/data.channels.master.show}}\n\n          {{#data.channels.ringer.show}}\n            <div>\n              <label for="{{by_id.ringervolume.elementId}}">\n                {{i18n.ringervolume}}\n              </label>\n              <input type="range" min="{{data.volume.min}}" max="{{data.volume.max}}" value="{{data.volumes.ringer}}" id="{{by_id.ringervolume.elementId}}">\n            </div>\n          {{/data.channels.ringer.show}}\n\n          {{#data.channels.tones.show}}\n            <div>\n              <label for="{{by_id.tonesvolume.elementId}}">\n                {{i18n.tonesvolume}}\n              </label>\n              <input type="range" min="{{data.volume.min}}" max="{{data.volume.max}}" value="{{data.volumes.tones}}" id="{{by_id.tonesvolume.elementId}}">\n            </div>\n          {{/data.channels.tones.show}}\n\n          {{#data.channels.preview.show}}\n            <div>\n              <label for="{{by_id.previewvolume.elementId}}">\n                {{i18n.previewvolume}}\n              </label>\n              <input type="range" min="{{data.volume.min}}" max="{{data.volume.max}}" value="{{data.volumes.preview}}" id="{{by_id.previewvolume.elementId}}">\n            </div>\n          {{/data.channels.preview.show}}          \n\n          {{#data.channels.remote.show}}\n            <div>\n              <label for="{{by_id.remotevolume.elementId}}">\n                {{i18n.remotevolume}}\n              </label>\n              <input type="range" min="{{data.volume.min}}" max="{{data.volume.max}}" value="{{data.volumes.remote}}" id="{{by_id.remotevolume.elementId}}">\n            </div>\n          {{/data.channels.remote.show}}\n\n        </div>\n        ';
      }
    }, {
      key: "_renderData",
      value: function _renderData() {
        var _this102 = this;

        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { volumes: {}, volume: {} };
        return Object.keys(this._config.channels).forEach(function (t) {
          e.volumes[t] = _this102._config.channels[t].volume * _this102._config.volumeMax;
        }), e.volume.max = this._config.volumeMax, e.volume.min = this._config.volumeMin, e;
      }
    }, {
      key: "_ringTimer",
      value: function _ringTimer() {
        var _this103 = this;

        this._ringerAudio.calls.length > 0 ? this._ringerAudio.ringerGain.gain.value < .5 ? (this._ringerUnmute(), this._ringingTimer = setTimeout(function () {
          _this103._ringTimer();
        }, 1e3 * this._config.channels.ringer.onTime)) : (this._ringerMute(), this._ringingTimer = setTimeout(function () {
          _this103._ringTimer();
        }, 1e3 * this._config.channels.ringer.offTime)) : (this._ringingTimer && (clearTimeout(this._ringingTimer), this._ringingTimer = null), this._ringerAudio.ringerConnected && (this._ringerAudio.ringerConnected = !1, this._ringerAudio.ringerGain.disconnect()));
      }
    }, {
      key: "_ringerMute",
      value: function _ringerMute() {
        var e = this._ringerAudio.context.currentTime + .2 * this._config.channels.ringer.onTime;this._ringerAudio.ringerGain.gain.cancelScheduledValues(0), this._ringerAudio.ringerGain.gain.exponentialRampToValueAtTime(1e-5, e);
      }
    }, {
      key: "_ringerUnmute",
      value: function _ringerUnmute() {
        var e = this._ringerAudio.context.currentTime + .2 * this._config.channels.ringer.offTime;this._ringerAudio.ringerGain.gain.cancelScheduledValues(0), this._ringerAudio.ringerGain.gain.exponentialRampToValueAtTime(.5, e);
      }
    }, {
      key: "_createLocalMediaStreamSource",
      value: function _createLocalMediaStreamSource(e) {
        return this._shimCreateMediaStreamSource(this._previewAudio.context, e);
      }
    }, {
      key: "_createRemoteMediaStreamSource",
      value: function _createRemoteMediaStreamSource(e) {
        return this._shimCreateMediaStreamSource(this._remoteAudio.context, e);
      }
    }, {
      key: "_connectLocalSourceStream",
      value: function _connectLocalSourceStream() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = this._previewAudio.sourceStream;t && (t.disconnect(), this._previewAudio.sourceStream = null), e && (this.startAudioContext(), this._previewAudio.sourceStream = e, this._previewAudio.sourceStream.connect(this._previewAudio.loopbackDelayNode)), this._emit("stream.local.changed", this, e, t);
      }
    }, {
      key: "_createLocalSourceStream",
      value: function _createLocalSourceStream(e) {
        if (!e.getTracks().find(function (e) {
          return "audio" == e.kind;
        })) return this._connectLocalSourceStream();this._connectLocalSourceStream(this._createLocalMediaStreamSource(e));
      }
    }, {
      key: "_connectRemoteSourceStream",
      value: function _connectRemoteSourceStream() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var t = this._remoteAudio.sourceStream;t && (t.disconnect(), this._remoteAudio.sourceStream = null), e && (this.startAudioContext(), this._remoteAudio.sourceStream = e, this._remoteAudio.sourceStream.connect(this._getOutputGainNode("remote"))), this._emit("stream.remote.changed", this, e, t);
      }
    }, {
      key: "_createRemoteSourceStream",
      value: function _createRemoteSourceStream(e) {
        if (!e.getTracks().find(function (e) {
          return "audio" == e.kind;
        })) return this._connectRemoteSourceStream();this._connectRemoteSourceStream(this._createRemoteMediaStreamSource(e));
      }
    }, {
      key: "_getOutputGainNode",
      value: function _getOutputGainNode(e) {
        switch (e) {case "master":
            return this._outputAudio.masterGain;case "ringer":
            return this._outputAudio.ringerGain;case "tones":
            return this._outputAudio.tonesGain;case "preview":
            return this._outputAudio.previewGain;case "remote":
            return this._outputAudio.remoteGain;}
      }
    }, {
      key: "_shimCreateBuffer",
      value: function _shimCreateBuffer(e) {
        for (var _len31 = arguments.length, t = Array(_len31 > 1 ? _len31 - 1 : 0), _key31 = 1; _key31 < _len31; _key31++) {
          t[_key31 - 1] = arguments[_key31];
        }

        return (e.createBuffer || e.webkitCreateBuffer).apply(e, t);
      }
    }, {
      key: "_shimCreateBufferSource",
      value: function _shimCreateBufferSource(e) {
        for (var _len32 = arguments.length, t = Array(_len32 > 1 ? _len32 - 1 : 0), _key32 = 1; _key32 < _len32; _key32++) {
          t[_key32 - 1] = arguments[_key32];
        }

        return (e.createBufferSource || e.webkitCreateBufferSource).apply(e, t);
      }
    }, {
      key: "_shimCreateDelay",
      value: function _shimCreateDelay(e) {
        for (var _len33 = arguments.length, t = Array(_len33 > 1 ? _len33 - 1 : 0), _key33 = 1; _key33 < _len33; _key33++) {
          t[_key33 - 1] = arguments[_key33];
        }

        return (e.createDelay || e.webkitCreateDelay).apply(e, t);
      }
    }, {
      key: "_shimCreateGain",
      value: function _shimCreateGain(e) {
        for (var _len34 = arguments.length, t = Array(_len34 > 1 ? _len34 - 1 : 0), _key34 = 1; _key34 < _len34; _key34++) {
          t[_key34 - 1] = arguments[_key34];
        }

        return (e.createGain || e.webkitCreateGain).apply(e, t);
      }
    }, {
      key: "_shimCreateOscillator",
      value: function _shimCreateOscillator(e) {
        for (var _len35 = arguments.length, t = Array(_len35 > 1 ? _len35 - 1 : 0), _key35 = 1; _key35 < _len35; _key35++) {
          t[_key35 - 1] = arguments[_key35];
        }

        return (e.createOscillator || e.webkitCreateOscillator).apply(e, t);
      }
    }, {
      key: "_shimCreateMediaStreamDestination",
      value: function _shimCreateMediaStreamDestination(e) {
        for (var _len36 = arguments.length, t = Array(_len36 > 1 ? _len36 - 1 : 0), _key36 = 1; _key36 < _len36; _key36++) {
          t[_key36 - 1] = arguments[_key36];
        }

        return (e.createMediaStreamDestination || e.webkitCreateMediaStreamDestination).apply(e, t);
      }
    }, {
      key: "_shimCreateMediaStreamSource",
      value: function _shimCreateMediaStreamSource(e) {
        for (var _len37 = arguments.length, t = Array(_len37 > 1 ? _len37 - 1 : 0), _key37 = 1; _key37 < _len37; _key37++) {
          t[_key37 - 1] = arguments[_key37];
        }

        return (e.createMediaStreamSource || e.webkitCreateMediaStreamSource).apply(e, t);
      }
    }, {
      key: "_shimAudioContext",
      value: function _shimAudioContext() {
        return X.isChrome() ? new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive", sampleRate: 44100 }) : new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
      }
    }]);
    return _t;
  }(re);t.default = function (_$$a) {
    (0, _inherits3.default)(_class, _$$a);

    function _class() {
      var _this104;

      var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      (0, _classCallCheck3.default)(this, _class);
      (_this104 = (0, _possibleConstructorReturn3.default)(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this)), _this104), _this104._libwebphone = _this104, _this104._initProperties(e), _this104._initInternationalization(_this104._config.i18n), _this104._config.userAgent.enabled && (_this104._userAgent = new ae(_this104, _this104._config.userAgent)), _this104._config.callList.enabled && (_this104._callList = new le(_this104, _this104._config.callList)), _this104._config.mediaDevices.enabled && (_this104._mediaDevices = new pt(_this104, _this104._config.mediaDevices)), _this104._config.audioContext.enabled && (_this104._audioContext = new _t(_this104, _this104._config.audioContext)), _this104._config.callControl.enabled && (_this104._callControl = new ue(_this104, _this104._config.callControl)), _this104._config.dialpad.enabled && (_this104._dialpad = new ce(_this104, _this104._config.dialpad)), _this104._config.videoCanvas.enabled && (_this104._videoCanvas = new gt(_this104, _this104._config.videoCanvas)), _this104._libwebphone._emit("created", _this104._libwebphone);return _this104;
    }

    (0, _createClass3.default)(_class, [{
      key: "getCallControl",
      value: function getCallControl() {
        return this._callControl;
      }
    }, {
      key: "getCallList",
      value: function getCallList() {
        return this._callList;
      }
    }, {
      key: "getDialpad",
      value: function getDialpad() {
        return this._dialpad;
      }
    }, {
      key: "getUserAgent",
      value: function getUserAgent() {
        return this._userAgent;
      }
    }, {
      key: "getMediaDevices",
      value: function getMediaDevices() {
        return this._mediaDevices;
      }
    }, {
      key: "getVideoCanvas",
      value: function getVideoCanvas() {
        return this._videoCanvas;
      }
    }, {
      key: "getAudioContext",
      value: function getAudioContext() {
        return this._audioContext;
      }
    }, {
      key: "getUtils",
      value: function getUtils() {
        return X;
      }
    }, {
      key: "geti18n",
      value: function geti18n() {
        return J;
      }
    }, {
      key: "i18nAddResourceBundles",
      value: function i18nAddResourceBundles(e, t) {
        for (var n in t) {
          this.i18nAddResourceBundle(e, n, t[n]);
        }
      }
    }, {
      key: "i18nAddResourceBundle",
      value: function i18nAddResourceBundle(e, t, n) {
        var r = {};r[e] = n, J.addResourceBundle(t, "libwebphone", r, !0), this._libwebphone._emit("language.bundle.added", this._libwebphone, t, r);
      }
    }, {
      key: "i18nTranslator",
      value: function i18nTranslator() {
        return this._translator;
      }
    }, {
      key: "_initProperties",
      value: function _initProperties(e) {
        this._config = X.merge({ i18n: { fallbackLng: "en" }, dialpad: { enabled: !0 }, callList: { enabled: !0 }, callControl: { enabled: !0 }, mediaDevices: { enabled: !0 }, mediaPreviews: { enabled: !1 }, audioContext: { enabled: !0 }, userAgent: { enabled: !0 }, videoCanvas: { enabled: !0 }, call: { useAudioContext: !1, globalKeyShortcuts: !0, keys: { spacebar: { enabled: !0, action: function action(e, t) {
                  "keydown" == e.type ? (t._muteHint = t.isMuted(), t._muteHint ? t.unmute() : t.mute()) : t._muteHint ? t.mute() : t.unmute();
                } } } } }, e), this._config.call.useAudioContext = this._config.call.useAudioContext && this._config.audioContext.enabled;
      }
    }, {
      key: "_initInternationalization",
      value: function _initInternationalization(e) {
        var _this105 = this;

        this._i18nPromise = J.init(e).then(function (e) {
          _this105._translator = e, _this105._libwebphone._emit("language.changed", _this105._libwebphone, e);
        });
      }
    }, {
      key: "_callListEvent",
      value: function _callListEvent(e, t) {
        for (var _len38 = arguments.length, n = Array(_len38 > 2 ? _len38 - 2 : 0), _key38 = 2; _key38 < _len38; _key38++) {
          n[_key38 - 2] = arguments[_key38];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("callList." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_callControlEvent",
      value: function _callControlEvent(e, t) {
        for (var _len39 = arguments.length, n = Array(_len39 > 2 ? _len39 - 2 : 0), _key39 = 2; _key39 < _len39; _key39++) {
          n[_key39 - 2] = arguments[_key39];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("callControl." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_dialpadEvent",
      value: function _dialpadEvent(e, t) {
        for (var _len40 = arguments.length, n = Array(_len40 > 2 ? _len40 - 2 : 0), _key40 = 2; _key40 < _len40; _key40++) {
          n[_key40 - 2] = arguments[_key40];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("dialpad." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_userAgentEvent",
      value: function _userAgentEvent(e, t) {
        for (var _len41 = arguments.length, n = Array(_len41 > 2 ? _len41 - 2 : 0), _key41 = 2; _key41 < _len41; _key41++) {
          n[_key41 - 2] = arguments[_key41];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("userAgent." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_mediaDevicesEvent",
      value: function _mediaDevicesEvent(e, t) {
        for (var _len42 = arguments.length, n = Array(_len42 > 2 ? _len42 - 2 : 0), _key42 = 2; _key42 < _len42; _key42++) {
          n[_key42 - 2] = arguments[_key42];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("mediaDevices." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_audioContextEvent",
      value: function _audioContextEvent(e, t) {
        for (var _len43 = arguments.length, n = Array(_len43 > 2 ? _len43 - 2 : 0), _key43 = 2; _key43 < _len43; _key43++) {
          n[_key43 - 2] = arguments[_key43];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("audioContext." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_callEvent",
      value: function _callEvent(e, t) {
        for (var _len44 = arguments.length, n = Array(_len44 > 2 ? _len44 - 2 : 0), _key44 = 2; _key44 < _len44; _key44++) {
          n[_key44 - 2] = arguments[_key44];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("call." + e), this._libwebphone._emit.apply(this._libwebphone, n), t.isPrimary() && (n.shift(), n.unshift("call.primary." + e), this._libwebphone._emit.apply(this._libwebphone, n), n.shift(), n.unshift("call.primary.update"), n.push(e), this._libwebphone._emit.apply(this._libwebphone, n));
      }
    }, {
      key: "_videoCanvasEvent",
      value: function _videoCanvasEvent(e, t) {
        for (var _len45 = arguments.length, n = Array(_len45 > 2 ? _len45 - 2 : 0), _key45 = 2; _key45 < _len45; _key45++) {
          n[_key45 - 2] = arguments[_key45];
        }

        n.unshift(t), n.unshift(this._libwebphone), n.unshift("videoCanvas." + e), this._libwebphone._emit.apply(this._libwebphone, n);
      }
    }, {
      key: "_emit",
      value: function _emit() {
        this.emit.apply(this, arguments);
      }
    }]);
    return _class;
  }($.a);
}]);
//# sourceMappingURL=libwebphone.js.map
