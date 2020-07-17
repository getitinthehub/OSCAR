(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)

},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],5:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("binternalip", [], factory);
	else if(typeof exports === 'object')
		exports["binternalip"] = factory();
	else
		root["binternalip"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
// compatibility for Firefox and chrome
// canisue: https://caniuse.com/#search=RTCPeerConnection
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var getMyIPAddr = new Promise(function (resolve, reject) {
  try {
    var pc = new RTCPeerConnection({
      iceServers: []
    });

    var noop = function noop() {}; // create a bogus data channel


    pc.createDataChannel(''); // create offer and set local description

    pc.createOffer(pc.setLocalDescription.bind(pc), noop);

    pc.onicecandidate = function (ice) {
      if (ice && ice.candidate && ice.candidate.candidate) {
        // eslint-disable-next-line max-len
        var myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)[1] || '';
        pc.onicecandidate = noop;
        resolve(myIP);
      }
    };
  } catch {
    resolve('');
  }
});
var _default = getMyIPAddr;
exports.default = _default;
module.exports = exports["default"];

/***/ })

/******/ });
});

},{}],6:[function(require,module,exports){
(function (global){
/**
  * bootstrap-table - An extended table to integration with some of the most widely used CSS frameworks. (Supports Bootstrap, Semantic UI, Bulma, Material Design, Foundation)
  *
  * @version v1.16.0
  * @homepage https://bootstrap-table.com
  * @author wenzhixin <wenzhixin2010@gmail.com> (http://wenzhixin.net.cn/)
  * @license MIT
  */

!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("jquery")):"function"==typeof define&&define.amd?define(["jquery"],e):(t=t||self).BootstrapTable=e(t.jQuery)}(this,(function(t){"use strict";t=t&&t.hasOwnProperty("default")?t.default:t;var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};function i(t,e){return t(e={exports:{}},e.exports),e.exports}var n=function(t){return t&&t.Math==Math&&t},o=n("object"==typeof globalThis&&globalThis)||n("object"==typeof window&&window)||n("object"==typeof self&&self)||n("object"==typeof e&&e)||Function("return this")(),r=function(t){try{return!!t()}catch(t){return!0}},a=!r((function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a})),s={}.propertyIsEnumerable,l=Object.getOwnPropertyDescriptor,c={f:l&&!s.call({1:2},1)?function(t){var e=l(this,t);return!!e&&e.enumerable}:s},h=function(t,e){return{enumerable:!(1&t),configurable:!(2&t),writable:!(4&t),value:e}},u={}.toString,d=function(t){return u.call(t).slice(8,-1)},f="".split,p=r((function(){return!Object("z").propertyIsEnumerable(0)}))?function(t){return"String"==d(t)?f.call(t,""):Object(t)}:Object,g=function(t){if(null==t)throw TypeError("Can't call method on "+t);return t},v=function(t){return p(g(t))},b=function(t){return"object"==typeof t?null!==t:"function"==typeof t},m=function(t,e){if(!b(t))return t;var i,n;if(e&&"function"==typeof(i=t.toString)&&!b(n=i.call(t)))return n;if("function"==typeof(i=t.valueOf)&&!b(n=i.call(t)))return n;if(!e&&"function"==typeof(i=t.toString)&&!b(n=i.call(t)))return n;throw TypeError("Can't convert object to primitive value")},y={}.hasOwnProperty,w=function(t,e){return y.call(t,e)},S=o.document,x=b(S)&&b(S.createElement),k=function(t){return x?S.createElement(t):{}},O=!a&&!r((function(){return 7!=Object.defineProperty(k("div"),"a",{get:function(){return 7}}).a})),C=Object.getOwnPropertyDescriptor,T={f:a?C:function(t,e){if(t=v(t),e=m(e,!0),O)try{return C(t,e)}catch(t){}if(w(t,e))return h(!c.f.call(t,e),t[e])}},P=function(t){if(!b(t))throw TypeError(String(t)+" is not an object");return t},$=Object.defineProperty,I={f:a?$:function(t,e,i){if(P(t),e=m(e,!0),P(i),O)try{return $(t,e,i)}catch(t){}if("get"in i||"set"in i)throw TypeError("Accessors not supported");return"value"in i&&(t[e]=i.value),t}},A=a?function(t,e,i){return I.f(t,e,h(1,i))}:function(t,e,i){return t[e]=i,t},E=function(t,e){try{A(o,t,e)}catch(i){o[t]=e}return e},R=o["__core-js_shared__"]||E("__core-js_shared__",{}),j=Function.toString;"function"!=typeof R.inspectSource&&(R.inspectSource=function(t){return j.call(t)});var N,F,_,B=R.inspectSource,V=o.WeakMap,L="function"==typeof V&&/native code/.test(B(V)),D=i((function(t){(t.exports=function(t,e){return R[t]||(R[t]=void 0!==e?e:{})})("versions",[]).push({version:"3.6.0",mode:"global",copyright:"© 2019 Denis Pushkarev (zloirock.ru)"})})),H=0,M=Math.random(),U=function(t){return"Symbol("+String(void 0===t?"":t)+")_"+(++H+M).toString(36)},z=D("keys"),q=function(t){return z[t]||(z[t]=U(t))},W={},G=o.WeakMap;if(L){var K=new G,J=K.get,Y=K.has,X=K.set;N=function(t,e){return X.call(K,t,e),e},F=function(t){return J.call(K,t)||{}},_=function(t){return Y.call(K,t)}}else{var Q=q("state");W[Q]=!0,N=function(t,e){return A(t,Q,e),e},F=function(t){return w(t,Q)?t[Q]:{}},_=function(t){return w(t,Q)}}var Z,tt={set:N,get:F,has:_,enforce:function(t){return _(t)?F(t):N(t,{})},getterFor:function(t){return function(e){var i;if(!b(e)||(i=F(e)).type!==t)throw TypeError("Incompatible receiver, "+t+" required");return i}}},et=i((function(t){var e=tt.get,i=tt.enforce,n=String(String).split("String");(t.exports=function(t,e,r,a){var s=!!a&&!!a.unsafe,l=!!a&&!!a.enumerable,c=!!a&&!!a.noTargetGet;"function"==typeof r&&("string"!=typeof e||w(r,"name")||A(r,"name",e),i(r).source=n.join("string"==typeof e?e:"")),t!==o?(s?!c&&t[e]&&(l=!0):delete t[e],l?t[e]=r:A(t,e,r)):l?t[e]=r:E(e,r)})(Function.prototype,"toString",(function(){return"function"==typeof this&&e(this).source||B(this)}))})),it=o,nt=function(t){return"function"==typeof t?t:void 0},ot=function(t,e){return arguments.length<2?nt(it[t])||nt(o[t]):it[t]&&it[t][e]||o[t]&&o[t][e]},rt=Math.ceil,at=Math.floor,st=function(t){return isNaN(t=+t)?0:(t>0?at:rt)(t)},lt=Math.min,ct=function(t){return t>0?lt(st(t),9007199254740991):0},ht=Math.max,ut=Math.min,dt=function(t,e){var i=st(t);return i<0?ht(i+e,0):ut(i,e)},ft=function(t){return function(e,i,n){var o,r=v(e),a=ct(r.length),s=dt(n,a);if(t&&i!=i){for(;a>s;)if((o=r[s++])!=o)return!0}else for(;a>s;s++)if((t||s in r)&&r[s]===i)return t||s||0;return!t&&-1}},pt={includes:ft(!0),indexOf:ft(!1)},gt=pt.indexOf,vt=function(t,e){var i,n=v(t),o=0,r=[];for(i in n)!w(W,i)&&w(n,i)&&r.push(i);for(;e.length>o;)w(n,i=e[o++])&&(~gt(r,i)||r.push(i));return r},bt=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"],mt=bt.concat("length","prototype"),yt={f:Object.getOwnPropertyNames||function(t){return vt(t,mt)}},wt={f:Object.getOwnPropertySymbols},St=ot("Reflect","ownKeys")||function(t){var e=yt.f(P(t)),i=wt.f;return i?e.concat(i(t)):e},xt=function(t,e){for(var i=St(e),n=I.f,o=T.f,r=0;r<i.length;r++){var a=i[r];w(t,a)||n(t,a,o(e,a))}},kt=/#|\.prototype\./,Ot=function(t,e){var i=Tt[Ct(t)];return i==$t||i!=Pt&&("function"==typeof e?r(e):!!e)},Ct=Ot.normalize=function(t){return String(t).replace(kt,".").toLowerCase()},Tt=Ot.data={},Pt=Ot.NATIVE="N",$t=Ot.POLYFILL="P",It=Ot,At=T.f,Et=function(t,e){var i,n,r,a,s,l=t.target,c=t.global,h=t.stat;if(i=c?o:h?o[l]||E(l,{}):(o[l]||{}).prototype)for(n in e){if(a=e[n],r=t.noTargetGet?(s=At(i,n))&&s.value:i[n],!It(c?n:l+(h?".":"#")+n,t.forced)&&void 0!==r){if(typeof a==typeof r)continue;xt(a,r)}(t.sham||r&&r.sham)&&A(a,"sham",!0),et(i,n,a,t)}},Rt=!!Object.getOwnPropertySymbols&&!r((function(){return!String(Symbol())})),jt=Rt&&!Symbol.sham&&"symbol"==typeof Symbol(),Nt=Array.isArray||function(t){return"Array"==d(t)},Ft=function(t){return Object(g(t))},_t=Object.keys||function(t){return vt(t,bt)},Bt=a?Object.defineProperties:function(t,e){P(t);for(var i,n=_t(e),o=n.length,r=0;o>r;)I.f(t,i=n[r++],e[i]);return t},Vt=ot("document","documentElement"),Lt=q("IE_PROTO"),Dt=function(){},Ht=function(t){return"<script>"+t+"<\/script>"},Mt=function(){try{Z=document.domain&&new ActiveXObject("htmlfile")}catch(t){}var t,e;Mt=Z?function(t){t.write(Ht("")),t.close();var e=t.parentWindow.Object;return t=null,e}(Z):((e=k("iframe")).style.display="none",Vt.appendChild(e),e.src=String("javascript:"),(t=e.contentWindow.document).open(),t.write(Ht("document.F=Object")),t.close(),t.F);for(var i=bt.length;i--;)delete Mt.prototype[bt[i]];return Mt()};W[Lt]=!0;var Ut=Object.create||function(t,e){var i;return null!==t?(Dt.prototype=P(t),i=new Dt,Dt.prototype=null,i[Lt]=t):i=Mt(),void 0===e?i:Bt(i,e)},zt=yt.f,qt={}.toString,Wt="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[],Gt={f:function(t){return Wt&&"[object Window]"==qt.call(t)?function(t){try{return zt(t)}catch(t){return Wt.slice()}}(t):zt(v(t))}},Kt=D("wks"),Jt=o.Symbol,Yt=jt?Jt:U,Xt=function(t){return w(Kt,t)||(Rt&&w(Jt,t)?Kt[t]=Jt[t]:Kt[t]=Yt("Symbol."+t)),Kt[t]},Qt={f:Xt},Zt=I.f,te=function(t){var e=it.Symbol||(it.Symbol={});w(e,t)||Zt(e,t,{value:Qt.f(t)})},ee=I.f,ie=Xt("toStringTag"),ne=function(t,e,i){t&&!w(t=i?t:t.prototype,ie)&&ee(t,ie,{configurable:!0,value:e})},oe=function(t){if("function"!=typeof t)throw TypeError(String(t)+" is not a function");return t},re=Xt("species"),ae=function(t,e){var i;return Nt(t)&&("function"!=typeof(i=t.constructor)||i!==Array&&!Nt(i.prototype)?b(i)&&null===(i=i[re])&&(i=void 0):i=void 0),new(void 0===i?Array:i)(0===e?0:e)},se=[].push,le=function(t){var e=1==t,i=2==t,n=3==t,o=4==t,r=6==t,a=5==t||r;return function(s,l,c,h){for(var u,d,f=Ft(s),g=p(f),v=function(t,e,i){if(oe(t),void 0===e)return t;switch(i){case 0:return function(){return t.call(e)};case 1:return function(i){return t.call(e,i)};case 2:return function(i,n){return t.call(e,i,n)};case 3:return function(i,n,o){return t.call(e,i,n,o)}}return function(){return t.apply(e,arguments)}}(l,c,3),b=ct(g.length),m=0,y=h||ae,w=e?y(s,b):i?y(s,0):void 0;b>m;m++)if((a||m in g)&&(d=v(u=g[m],m,f),t))if(e)w[m]=d;else if(d)switch(t){case 3:return!0;case 5:return u;case 6:return m;case 2:se.call(w,u)}else if(o)return!1;return r?-1:n||o?o:w}},ce={forEach:le(0),map:le(1),filter:le(2),some:le(3),every:le(4),find:le(5),findIndex:le(6)},he=ce.forEach,ue=q("hidden"),de=Xt("toPrimitive"),fe=tt.set,pe=tt.getterFor("Symbol"),ge=Object.prototype,ve=o.Symbol,be=ot("JSON","stringify"),me=T.f,ye=I.f,we=Gt.f,Se=c.f,xe=D("symbols"),ke=D("op-symbols"),Oe=D("string-to-symbol-registry"),Ce=D("symbol-to-string-registry"),Te=D("wks"),Pe=o.QObject,$e=!Pe||!Pe.prototype||!Pe.prototype.findChild,Ie=a&&r((function(){return 7!=Ut(ye({},"a",{get:function(){return ye(this,"a",{value:7}).a}})).a}))?function(t,e,i){var n=me(ge,e);n&&delete ge[e],ye(t,e,i),n&&t!==ge&&ye(ge,e,n)}:ye,Ae=function(t,e){var i=xe[t]=Ut(ve.prototype);return fe(i,{type:"Symbol",tag:t,description:e}),a||(i.description=e),i},Ee=Rt&&"symbol"==typeof ve.iterator?function(t){return"symbol"==typeof t}:function(t){return Object(t)instanceof ve},Re=function(t,e,i){t===ge&&Re(ke,e,i),P(t);var n=m(e,!0);return P(i),w(xe,n)?(i.enumerable?(w(t,ue)&&t[ue][n]&&(t[ue][n]=!1),i=Ut(i,{enumerable:h(0,!1)})):(w(t,ue)||ye(t,ue,h(1,{})),t[ue][n]=!0),Ie(t,n,i)):ye(t,n,i)},je=function(t,e){P(t);var i=v(e),n=_t(i).concat(Be(i));return he(n,(function(e){a&&!Ne.call(i,e)||Re(t,e,i[e])})),t},Ne=function(t){var e=m(t,!0),i=Se.call(this,e);return!(this===ge&&w(xe,e)&&!w(ke,e))&&(!(i||!w(this,e)||!w(xe,e)||w(this,ue)&&this[ue][e])||i)},Fe=function(t,e){var i=v(t),n=m(e,!0);if(i!==ge||!w(xe,n)||w(ke,n)){var o=me(i,n);return!o||!w(xe,n)||w(i,ue)&&i[ue][n]||(o.enumerable=!0),o}},_e=function(t){var e=we(v(t)),i=[];return he(e,(function(t){w(xe,t)||w(W,t)||i.push(t)})),i},Be=function(t){var e=t===ge,i=we(e?ke:v(t)),n=[];return he(i,(function(t){!w(xe,t)||e&&!w(ge,t)||n.push(xe[t])})),n};if(Rt||(et((ve=function(){if(this instanceof ve)throw TypeError("Symbol is not a constructor");var t=arguments.length&&void 0!==arguments[0]?String(arguments[0]):void 0,e=U(t),i=function(t){this===ge&&i.call(ke,t),w(this,ue)&&w(this[ue],e)&&(this[ue][e]=!1),Ie(this,e,h(1,t))};return a&&$e&&Ie(ge,e,{configurable:!0,set:i}),Ae(e,t)}).prototype,"toString",(function(){return pe(this).tag})),c.f=Ne,I.f=Re,T.f=Fe,yt.f=Gt.f=_e,wt.f=Be,a&&(ye(ve.prototype,"description",{configurable:!0,get:function(){return pe(this).description}}),et(ge,"propertyIsEnumerable",Ne,{unsafe:!0}))),jt||(Qt.f=function(t){return Ae(Xt(t),t)}),Et({global:!0,wrap:!0,forced:!Rt,sham:!Rt},{Symbol:ve}),he(_t(Te),(function(t){te(t)})),Et({target:"Symbol",stat:!0,forced:!Rt},{for:function(t){var e=String(t);if(w(Oe,e))return Oe[e];var i=ve(e);return Oe[e]=i,Ce[i]=e,i},keyFor:function(t){if(!Ee(t))throw TypeError(t+" is not a symbol");if(w(Ce,t))return Ce[t]},useSetter:function(){$e=!0},useSimple:function(){$e=!1}}),Et({target:"Object",stat:!0,forced:!Rt,sham:!a},{create:function(t,e){return void 0===e?Ut(t):je(Ut(t),e)},defineProperty:Re,defineProperties:je,getOwnPropertyDescriptor:Fe}),Et({target:"Object",stat:!0,forced:!Rt},{getOwnPropertyNames:_e,getOwnPropertySymbols:Be}),Et({target:"Object",stat:!0,forced:r((function(){wt.f(1)}))},{getOwnPropertySymbols:function(t){return wt.f(Ft(t))}}),be){var Ve=!Rt||r((function(){var t=ve();return"[null]"!=be([t])||"{}"!=be({a:t})||"{}"!=be(Object(t))}));Et({target:"JSON",stat:!0,forced:Ve},{stringify:function(t,e,i){for(var n,o=[t],r=1;arguments.length>r;)o.push(arguments[r++]);if(n=e,(b(e)||void 0!==t)&&!Ee(t))return Nt(e)||(e=function(t,e){if("function"==typeof n&&(e=n.call(this,t,e)),!Ee(e))return e}),o[1]=e,be.apply(null,o)}})}ve.prototype[de]||A(ve.prototype,de,ve.prototype.valueOf),ne(ve,"Symbol"),W[ue]=!0;var Le=I.f,De=o.Symbol;if(a&&"function"==typeof De&&(!("description"in De.prototype)||void 0!==De().description)){var He={},Me=function(){var t=arguments.length<1||void 0===arguments[0]?void 0:String(arguments[0]),e=this instanceof Me?new De(t):void 0===t?De():De(t);return""===t&&(He[e]=!0),e};xt(Me,De);var Ue=Me.prototype=De.prototype;Ue.constructor=Me;var ze=Ue.toString,qe="Symbol(test)"==String(De("test")),We=/^Symbol\((.*)\)[^)]+$/;Le(Ue,"description",{configurable:!0,get:function(){var t=b(this)?this.valueOf():this,e=ze.call(t);if(w(He,t))return"";var i=qe?e.slice(7,-1):e.replace(We,"$1");return""===i?void 0:i}}),Et({global:!0,forced:!0},{Symbol:Me})}te("iterator");var Ge,Ke,Je=function(t,e,i){var n=m(e);n in t?I.f(t,n,h(0,i)):t[n]=i},Ye=ot("navigator","userAgent")||"",Xe=o.process,Qe=Xe&&Xe.versions,Ze=Qe&&Qe.v8;Ze?Ke=(Ge=Ze.split("."))[0]+Ge[1]:Ye&&(!(Ge=Ye.match(/Edge\/(\d+)/))||Ge[1]>=74)&&(Ge=Ye.match(/Chrome\/(\d+)/))&&(Ke=Ge[1]);var ti=Ke&&+Ke,ei=Xt("species"),ii=function(t){return ti>=51||!r((function(){var e=[];return(e.constructor={})[ei]=function(){return{foo:1}},1!==e[t](Boolean).foo}))},ni=Xt("isConcatSpreadable"),oi=ti>=51||!r((function(){var t=[];return t[ni]=!1,t.concat()[0]!==t})),ri=ii("concat"),ai=function(t){if(!b(t))return!1;var e=t[ni];return void 0!==e?!!e:Nt(t)};Et({target:"Array",proto:!0,forced:!oi||!ri},{concat:function(t){var e,i,n,o,r,a=Ft(this),s=ae(a,0),l=0;for(e=-1,n=arguments.length;e<n;e++)if(r=-1===e?a:arguments[e],ai(r)){if(l+(o=ct(r.length))>9007199254740991)throw TypeError("Maximum allowed index exceeded");for(i=0;i<o;i++,l++)i in r&&Je(s,l,r[i])}else{if(l>=9007199254740991)throw TypeError("Maximum allowed index exceeded");Je(s,l++,r)}return s.length=l,s}});var si=ce.filter,li=ii("filter"),ci=li&&!r((function(){[].filter.call({length:-1,0:1},(function(t){throw t}))}));Et({target:"Array",proto:!0,forced:!li||!ci},{filter:function(t){return si(this,t,arguments.length>1?arguments[1]:void 0)}});var hi=Xt("unscopables"),ui=Array.prototype;null==ui[hi]&&I.f(ui,hi,{configurable:!0,value:Ut(null)});var di=function(t){ui[hi][t]=!0},fi=ce.find,pi=!0;"find"in[]&&Array(1).find((function(){pi=!1})),Et({target:"Array",proto:!0,forced:pi},{find:function(t){return fi(this,t,arguments.length>1?arguments[1]:void 0)}}),di("find");var gi=ce.findIndex,vi=!0;"findIndex"in[]&&Array(1).findIndex((function(){vi=!1})),Et({target:"Array",proto:!0,forced:vi},{findIndex:function(t){return gi(this,t,arguments.length>1?arguments[1]:void 0)}}),di("findIndex");var bi=pt.includes;Et({target:"Array",proto:!0},{includes:function(t){return bi(this,t,arguments.length>1?arguments[1]:void 0)}}),di("includes");var mi=function(t,e){var i=[][t];return!i||!r((function(){i.call(null,e||function(){throw 1},1)}))},yi=pt.indexOf,wi=[].indexOf,Si=!!wi&&1/[1].indexOf(1,-0)<0,xi=mi("indexOf");Et({target:"Array",proto:!0,forced:Si||xi},{indexOf:function(t){return Si?wi.apply(this,arguments)||0:yi(this,t,arguments.length>1?arguments[1]:void 0)}});var ki,Oi,Ci,Ti=!r((function(){function t(){}return t.prototype.constructor=null,Object.getPrototypeOf(new t)!==t.prototype})),Pi=q("IE_PROTO"),$i=Object.prototype,Ii=Ti?Object.getPrototypeOf:function(t){return t=Ft(t),w(t,Pi)?t[Pi]:"function"==typeof t.constructor&&t instanceof t.constructor?t.constructor.prototype:t instanceof Object?$i:null},Ai=Xt("iterator"),Ei=!1;[].keys&&("next"in(Ci=[].keys())?(Oi=Ii(Ii(Ci)))!==Object.prototype&&(ki=Oi):Ei=!0),null==ki&&(ki={}),w(ki,Ai)||A(ki,Ai,(function(){return this}));var Ri={IteratorPrototype:ki,BUGGY_SAFARI_ITERATORS:Ei},ji=Ri.IteratorPrototype,Ni=Object.setPrototypeOf||("__proto__"in{}?function(){var t,e=!1,i={};try{(t=Object.getOwnPropertyDescriptor(Object.prototype,"__proto__").set).call(i,[]),e=i instanceof Array}catch(t){}return function(i,n){return P(i),function(t){if(!b(t)&&null!==t)throw TypeError("Can't set "+String(t)+" as a prototype")}(n),e?t.call(i,n):i.__proto__=n,i}}():void 0),Fi=Ri.IteratorPrototype,_i=Ri.BUGGY_SAFARI_ITERATORS,Bi=Xt("iterator"),Vi=function(){return this},Li=function(t,e,i,n,o,r,a){!function(t,e,i){var n=e+" Iterator";t.prototype=Ut(ji,{next:h(1,i)}),ne(t,n,!1)}(i,e,n);var s,l,c,u=function(t){if(t===o&&v)return v;if(!_i&&t in p)return p[t];switch(t){case"keys":case"values":case"entries":return function(){return new i(this,t)}}return function(){return new i(this)}},d=e+" Iterator",f=!1,p=t.prototype,g=p[Bi]||p["@@iterator"]||o&&p[o],v=!_i&&g||u(o),b="Array"==e&&p.entries||g;if(b&&(s=Ii(b.call(new t)),Fi!==Object.prototype&&s.next&&(Ii(s)!==Fi&&(Ni?Ni(s,Fi):"function"!=typeof s[Bi]&&A(s,Bi,Vi)),ne(s,d,!0))),"values"==o&&g&&"values"!==g.name&&(f=!0,v=function(){return g.call(this)}),p[Bi]!==v&&A(p,Bi,v),o)if(l={values:u("values"),keys:r?v:u("keys"),entries:u("entries")},a)for(c in l)!_i&&!f&&c in p||et(p,c,l[c]);else Et({target:e,proto:!0,forced:_i||f},l);return l},Di=tt.set,Hi=tt.getterFor("Array Iterator"),Mi=Li(Array,"Array",(function(t,e){Di(this,{type:"Array Iterator",target:v(t),index:0,kind:e})}),(function(){var t=Hi(this),e=t.target,i=t.kind,n=t.index++;return!e||n>=e.length?(t.target=void 0,{value:void 0,done:!0}):"keys"==i?{value:n,done:!1}:"values"==i?{value:e[n],done:!1}:{value:[n,e[n]],done:!1}}),"values");di("keys"),di("values"),di("entries");var Ui=[].join,zi=p!=Object,qi=mi("join",",");Et({target:"Array",proto:!0,forced:zi||qi},{join:function(t){return Ui.call(v(this),void 0===t?",":t)}});var Wi=ce.map,Gi=ii("map"),Ki=Gi&&!r((function(){[].map.call({length:-1,0:1},(function(t){throw t}))}));Et({target:"Array",proto:!0,forced:!Gi||!Ki},{map:function(t){return Wi(this,t,arguments.length>1?arguments[1]:void 0)}});var Ji=[].reverse,Yi=[1,2];Et({target:"Array",proto:!0,forced:String(Yi)===String(Yi.reverse())},{reverse:function(){return Nt(this)&&(this.length=this.length),Ji.call(this)}});var Xi=Xt("species"),Qi=[].slice,Zi=Math.max;Et({target:"Array",proto:!0,forced:!ii("slice")},{slice:function(t,e){var i,n,o,r=v(this),a=ct(r.length),s=dt(t,a),l=dt(void 0===e?a:e,a);if(Nt(r)&&("function"!=typeof(i=r.constructor)||i!==Array&&!Nt(i.prototype)?b(i)&&null===(i=i[Xi])&&(i=void 0):i=void 0,i===Array||void 0===i))return Qi.call(r,s,l);for(n=new(void 0===i?Array:i)(Zi(l-s,0)),o=0;s<l;s++,o++)s in r&&Je(n,o,r[s]);return n.length=o,n}});var tn=[],en=tn.sort,nn=r((function(){tn.sort(void 0)})),on=r((function(){tn.sort(null)})),rn=mi("sort");Et({target:"Array",proto:!0,forced:nn||!on||rn},{sort:function(t){return void 0===t?en.call(Ft(this)):en.call(Ft(this),oe(t))}});var an=Math.max,sn=Math.min;Et({target:"Array",proto:!0,forced:!ii("splice")},{splice:function(t,e){var i,n,o,r,a,s,l=Ft(this),c=ct(l.length),h=dt(t,c),u=arguments.length;if(0===u?i=n=0:1===u?(i=0,n=c-h):(i=u-2,n=sn(an(st(e),0),c-h)),c+i-n>9007199254740991)throw TypeError("Maximum allowed length exceeded");for(o=ae(l,n),r=0;r<n;r++)(a=h+r)in l&&Je(o,r,l[a]);if(o.length=n,i<n){for(r=h;r<c-n;r++)s=r+i,(a=r+n)in l?l[s]=l[a]:delete l[s];for(r=c;r>c-n+i;r--)delete l[r-1]}else if(i>n)for(r=c-n;r>h;r--)s=r+i-1,(a=r+n-1)in l?l[s]=l[a]:delete l[s];for(r=0;r<i;r++)l[r+h]=arguments[r+2];return l.length=c-n+i,o}});var ln=function(t,e,i){var n,o;return Ni&&"function"==typeof(n=e.constructor)&&n!==i&&b(o=n.prototype)&&o!==i.prototype&&Ni(t,o),t},cn="\t\n\v\f\r                　\u2028\u2029\ufeff",hn="["+cn+"]",un=RegExp("^"+hn+hn+"*"),dn=RegExp(hn+hn+"*$"),fn=function(t){return function(e){var i=String(g(e));return 1&t&&(i=i.replace(un,"")),2&t&&(i=i.replace(dn,"")),i}},pn={start:fn(1),end:fn(2),trim:fn(3)},gn=yt.f,vn=T.f,bn=I.f,mn=pn.trim,yn=o.Number,wn=yn.prototype,Sn="Number"==d(Ut(wn)),xn=function(t){var e,i,n,o,r,a,s,l,c=m(t,!1);if("string"==typeof c&&c.length>2)if(43===(e=(c=mn(c)).charCodeAt(0))||45===e){if(88===(i=c.charCodeAt(2))||120===i)return NaN}else if(48===e){switch(c.charCodeAt(1)){case 66:case 98:n=2,o=49;break;case 79:case 111:n=8,o=55;break;default:return+c}for(a=(r=c.slice(2)).length,s=0;s<a;s++)if((l=r.charCodeAt(s))<48||l>o)return NaN;return parseInt(r,n)}return+c};if(It("Number",!yn(" 0o1")||!yn("0b1")||yn("+0x1"))){for(var kn,On=function(t){var e=arguments.length<1?0:t,i=this;return i instanceof On&&(Sn?r((function(){wn.valueOf.call(i)})):"Number"!=d(i))?ln(new yn(xn(e)),i,On):xn(e)},Cn=a?gn(yn):"MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger".split(","),Tn=0;Cn.length>Tn;Tn++)w(yn,kn=Cn[Tn])&&!w(On,kn)&&bn(On,kn,vn(yn,kn));On.prototype=wn,wn.constructor=On,et(o,"Number",On)}var Pn=Object.assign,$n=Object.defineProperty,In=!Pn||r((function(){if(a&&1!==Pn({b:1},Pn($n({},"a",{enumerable:!0,get:function(){$n(this,"b",{value:3,enumerable:!1})}}),{b:2})).b)return!0;var t={},e={},i=Symbol();return t[i]=7,"abcdefghijklmnopqrst".split("").forEach((function(t){e[t]=t})),7!=Pn({},t)[i]||"abcdefghijklmnopqrst"!=_t(Pn({},e)).join("")}))?function(t,e){for(var i=Ft(t),n=arguments.length,o=1,r=wt.f,s=c.f;n>o;)for(var l,h=p(arguments[o++]),u=r?_t(h).concat(r(h)):_t(h),d=u.length,f=0;d>f;)l=u[f++],a&&!s.call(h,l)||(i[l]=h[l]);return i}:Pn;Et({target:"Object",stat:!0,forced:Object.assign!==In},{assign:In});var An=c.f,En=function(t){return function(e){for(var i,n=v(e),o=_t(n),r=o.length,s=0,l=[];r>s;)i=o[s++],a&&!An.call(n,i)||l.push(t?[i,n[i]]:n[i]);return l}},Rn={entries:En(!0),values:En(!1)}.entries;Et({target:"Object",stat:!0},{entries:function(t){return Rn(t)}});var jn={};jn[Xt("toStringTag")]="z";var Nn="[object z]"===String(jn),Fn=Xt("toStringTag"),_n="Arguments"==d(function(){return arguments}()),Bn=Nn?d:function(t){var e,i,n;return void 0===t?"Undefined":null===t?"Null":"string"==typeof(i=function(t,e){try{return t[e]}catch(t){}}(e=Object(t),Fn))?i:_n?d(e):"Object"==(n=d(e))&&"function"==typeof e.callee?"Arguments":n},Vn=Nn?{}.toString:function(){return"[object "+Bn(this)+"]"};Nn||et(Object.prototype,"toString",Vn,{unsafe:!0});var Ln=pn.trim,Dn=o.parseFloat,Hn=1/Dn(cn+"-0")!=-1/0?function(t){var e=Ln(String(t)),i=Dn(e);return 0===i&&"-"==e.charAt(0)?-0:i}:Dn;Et({global:!0,forced:parseFloat!=Hn},{parseFloat:Hn});var Mn=pn.trim,Un=o.parseInt,zn=/^[+-]?0[Xx]/,qn=8!==Un(cn+"08")||22!==Un(cn+"0x16")?function(t,e){var i=Mn(String(t));return Un(i,e>>>0||(zn.test(i)?16:10))}:Un;Et({global:!0,forced:parseInt!=qn},{parseInt:qn});var Wn=function(){var t=P(this),e="";return t.global&&(e+="g"),t.ignoreCase&&(e+="i"),t.multiline&&(e+="m"),t.dotAll&&(e+="s"),t.unicode&&(e+="u"),t.sticky&&(e+="y"),e};function Gn(t,e){return RegExp(t,e)}var Kn,Jn,Yn={UNSUPPORTED_Y:r((function(){var t=Gn("a","y");return t.lastIndex=2,null!=t.exec("abcd")})),BROKEN_CARET:r((function(){var t=Gn("^r","gy");return t.lastIndex=2,null!=t.exec("str")}))},Xn=RegExp.prototype.exec,Qn=String.prototype.replace,Zn=Xn,to=(Kn=/a/,Jn=/b*/g,Xn.call(Kn,"a"),Xn.call(Jn,"a"),0!==Kn.lastIndex||0!==Jn.lastIndex),eo=Yn.UNSUPPORTED_Y||Yn.BROKEN_CARET,io=void 0!==/()??/.exec("")[1];(to||io||eo)&&(Zn=function(t){var e,i,n,o,r=this,a=eo&&r.sticky,s=Wn.call(r),l=r.source,c=0,h=t;return a&&(-1===(s=s.replace("y","")).indexOf("g")&&(s+="g"),h=String(t).slice(r.lastIndex),r.lastIndex>0&&(!r.multiline||r.multiline&&"\n"!==t[r.lastIndex-1])&&(l="(?: "+l+")",h=" "+h,c++),i=new RegExp("^(?:"+l+")",s)),io&&(i=new RegExp("^"+l+"$(?!\\s)",s)),to&&(e=r.lastIndex),n=Xn.call(a?i:r,h),a?n?(n.input=n.input.slice(c),n[0]=n[0].slice(c),n.index=r.lastIndex,r.lastIndex+=n[0].length):r.lastIndex=0:to&&n&&(r.lastIndex=r.global?n.index+n[0].length:e),io&&n&&n.length>1&&Qn.call(n[0],i,(function(){for(o=1;o<arguments.length-2;o++)void 0===arguments[o]&&(n[o]=void 0)})),n});var no=Zn;Et({target:"RegExp",proto:!0,forced:/./.exec!==no},{exec:no});var oo=RegExp.prototype,ro=oo.toString,ao=r((function(){return"/a/b"!=ro.call({source:"a",flags:"b"})})),so="toString"!=ro.name;(ao||so)&&et(RegExp.prototype,"toString",(function(){var t=P(this),e=String(t.source),i=t.flags;return"/"+e+"/"+String(void 0===i&&t instanceof RegExp&&!("flags"in oo)?Wn.call(t):i)}),{unsafe:!0});var lo=Xt("match"),co=function(t){var e;return b(t)&&(void 0!==(e=t[lo])?!!e:"RegExp"==d(t))},ho=function(t){if(co(t))throw TypeError("The method doesn't accept regular expressions");return t},uo=Xt("match");Et({target:"String",proto:!0,forced:!function(t){var e=/./;try{"/./"[t](e)}catch(i){try{return e[uo]=!1,"/./"[t](e)}catch(t){}}return!1}("includes")},{includes:function(t){return!!~String(g(this)).indexOf(ho(t),arguments.length>1?arguments[1]:void 0)}});var fo=function(t){return function(e,i){var n,o,r=String(g(e)),a=st(i),s=r.length;return a<0||a>=s?t?"":void 0:(n=r.charCodeAt(a))<55296||n>56319||a+1===s||(o=r.charCodeAt(a+1))<56320||o>57343?t?r.charAt(a):n:t?r.slice(a,a+2):o-56320+(n-55296<<10)+65536}},po={codeAt:fo(!1),charAt:fo(!0)},go=po.charAt,vo=tt.set,bo=tt.getterFor("String Iterator");Li(String,"String",(function(t){vo(this,{type:"String Iterator",string:String(t),index:0})}),(function(){var t,e=bo(this),i=e.string,n=e.index;return n>=i.length?{value:void 0,done:!0}:(t=go(i,n),e.index+=t.length,{value:t,done:!1})}));var mo=Xt("species"),yo=!r((function(){var t=/./;return t.exec=function(){var t=[];return t.groups={a:"7"},t},"7"!=="".replace(t,"$<a>")})),wo="$0"==="a".replace(/./,"$0"),So=!r((function(){var t=/(?:)/,e=t.exec;t.exec=function(){return e.apply(this,arguments)};var i="ab".split(t);return 2!==i.length||"a"!==i[0]||"b"!==i[1]})),xo=function(t,e,i,n){var o=Xt(t),a=!r((function(){var e={};return e[o]=function(){return 7},7!=""[t](e)})),s=a&&!r((function(){var e=!1,i=/a/;return"split"===t&&((i={}).constructor={},i.constructor[mo]=function(){return i},i.flags="",i[o]=/./[o]),i.exec=function(){return e=!0,null},i[o](""),!e}));if(!a||!s||"replace"===t&&(!yo||!wo)||"split"===t&&!So){var l=/./[o],c=i(o,""[t],(function(t,e,i,n,o){return e.exec===no?a&&!o?{done:!0,value:l.call(e,i,n)}:{done:!0,value:t.call(i,e,n)}:{done:!1}}),{REPLACE_KEEPS_$0:wo}),h=c[0],u=c[1];et(String.prototype,t,h),et(RegExp.prototype,o,2==e?function(t,e){return u.call(t,this,e)}:function(t){return u.call(t,this)})}n&&A(RegExp.prototype[o],"sham",!0)},ko=po.charAt,Oo=function(t,e,i){return e+(i?ko(t,e).length:1)},Co=function(t,e){var i=t.exec;if("function"==typeof i){var n=i.call(t,e);if("object"!=typeof n)throw TypeError("RegExp exec method returned something other than an Object or null");return n}if("RegExp"!==d(t))throw TypeError("RegExp#exec called on incompatible receiver");return no.call(t,e)},To=Math.max,Po=Math.min,$o=Math.floor,Io=/\$([$&'`]|\d\d?|<[^>]*>)/g,Ao=/\$([$&'`]|\d\d?)/g;xo("replace",2,(function(t,e,i,n){return[function(i,n){var o=g(this),r=null==i?void 0:i[t];return void 0!==r?r.call(i,o,n):e.call(String(o),i,n)},function(t,r){if(n.REPLACE_KEEPS_$0||"string"==typeof r&&-1===r.indexOf("$0")){var a=i(e,t,this,r);if(a.done)return a.value}var s=P(t),l=String(this),c="function"==typeof r;c||(r=String(r));var h=s.global;if(h){var u=s.unicode;s.lastIndex=0}for(var d=[];;){var f=Co(s,l);if(null===f)break;if(d.push(f),!h)break;""===String(f[0])&&(s.lastIndex=Oo(l,ct(s.lastIndex),u))}for(var p,g="",v=0,b=0;b<d.length;b++){f=d[b];for(var m=String(f[0]),y=To(Po(st(f.index),l.length),0),w=[],S=1;S<f.length;S++)w.push(void 0===(p=f[S])?p:String(p));var x=f.groups;if(c){var k=[m].concat(w,y,l);void 0!==x&&k.push(x);var O=String(r.apply(void 0,k))}else O=o(m,l,y,w,x,r);y>=v&&(g+=l.slice(v,y)+O,v=y+m.length)}return g+l.slice(v)}];function o(t,i,n,o,r,a){var s=n+t.length,l=o.length,c=Ao;return void 0!==r&&(r=Ft(r),c=Io),e.call(a,c,(function(e,a){var c;switch(a.charAt(0)){case"$":return"$";case"&":return t;case"`":return i.slice(0,n);case"'":return i.slice(s);case"<":c=r[a.slice(1,-1)];break;default:var h=+a;if(0===h)return e;if(h>l){var u=$o(h/10);return 0===u?e:u<=l?void 0===o[u-1]?a.charAt(1):o[u-1]+a.charAt(1):e}c=o[h-1]}return void 0===c?"":c}))}}));var Eo=Object.is||function(t,e){return t===e?0!==t||1/t==1/e:t!=t&&e!=e};xo("search",1,(function(t,e,i){return[function(e){var i=g(this),n=null==e?void 0:e[t];return void 0!==n?n.call(e,i):new RegExp(e)[t](String(i))},function(t){var n=i(e,t,this);if(n.done)return n.value;var o=P(t),r=String(this),a=o.lastIndex;Eo(a,0)||(o.lastIndex=0);var s=Co(o,r);return Eo(o.lastIndex,a)||(o.lastIndex=a),null===s?-1:s.index}]}));var Ro=Xt("species"),jo=[].push,No=Math.min,Fo=!r((function(){return!RegExp(4294967295,"y")}));xo("split",2,(function(t,e,i){var n;return n="c"=="abbc".split(/(b)*/)[1]||4!="test".split(/(?:)/,-1).length||2!="ab".split(/(?:ab)*/).length||4!=".".split(/(.?)(.?)/).length||".".split(/()()/).length>1||"".split(/.?/).length?function(t,i){var n=String(g(this)),o=void 0===i?4294967295:i>>>0;if(0===o)return[];if(void 0===t)return[n];if(!co(t))return e.call(n,t,o);for(var r,a,s,l=[],c=(t.ignoreCase?"i":"")+(t.multiline?"m":"")+(t.unicode?"u":"")+(t.sticky?"y":""),h=0,u=new RegExp(t.source,c+"g");(r=no.call(u,n))&&!((a=u.lastIndex)>h&&(l.push(n.slice(h,r.index)),r.length>1&&r.index<n.length&&jo.apply(l,r.slice(1)),s=r[0].length,h=a,l.length>=o));)u.lastIndex===r.index&&u.lastIndex++;return h===n.length?!s&&u.test("")||l.push(""):l.push(n.slice(h)),l.length>o?l.slice(0,o):l}:"0".split(void 0,0).length?function(t,i){return void 0===t&&0===i?[]:e.call(this,t,i)}:e,[function(e,i){var o=g(this),r=null==e?void 0:e[t];return void 0!==r?r.call(e,o,i):n.call(String(o),e,i)},function(t,o){var r=i(n,t,this,o,n!==e);if(r.done)return r.value;var a=P(t),s=String(this),l=function(t,e){var i,n=P(t).constructor;return void 0===n||null==(i=P(n)[Ro])?e:oe(i)}(a,RegExp),c=a.unicode,h=(a.ignoreCase?"i":"")+(a.multiline?"m":"")+(a.unicode?"u":"")+(Fo?"y":"g"),u=new l(Fo?a:"^(?:"+a.source+")",h),d=void 0===o?4294967295:o>>>0;if(0===d)return[];if(0===s.length)return null===Co(u,s)?[s]:[];for(var f=0,p=0,g=[];p<s.length;){u.lastIndex=Fo?p:0;var v,b=Co(u,Fo?s:s.slice(p));if(null===b||(v=No(ct(u.lastIndex+(Fo?0:p)),s.length))===f)p=Oo(s,p,c);else{if(g.push(s.slice(f,p)),g.length===d)return g;for(var m=1;m<=b.length-1;m++)if(g.push(b[m]),g.length===d)return g;p=f=v}}return g.push(s.slice(f)),g}]}),!Fo);var _o=pn.trim;Et({target:"String",proto:!0,forced:function(t){return r((function(){return!!cn[t]()||"​᠎"!="​᠎"[t]()||cn[t].name!==t}))}("trim")},{trim:function(){return _o(this)}});var Bo={CSSRuleList:0,CSSStyleDeclaration:0,CSSValueList:0,ClientRectList:0,DOMRectList:0,DOMStringList:0,DOMTokenList:1,DataTransferItemList:0,FileList:0,HTMLAllCollection:0,HTMLCollection:0,HTMLFormElement:0,HTMLSelectElement:0,MediaList:0,MimeTypeArray:0,NamedNodeMap:0,NodeList:1,PaintRequestList:0,Plugin:0,PluginArray:0,SVGLengthList:0,SVGNumberList:0,SVGPathSegList:0,SVGPointList:0,SVGStringList:0,SVGTransformList:0,SourceBufferList:0,StyleSheetList:0,TextTrackCueList:0,TextTrackList:0,TouchList:0},Vo=ce.forEach,Lo=mi("forEach")?function(t){return Vo(this,t,arguments.length>1?arguments[1]:void 0)}:[].forEach;for(var Do in Bo){var Ho=o[Do],Mo=Ho&&Ho.prototype;if(Mo&&Mo.forEach!==Lo)try{A(Mo,"forEach",Lo)}catch(t){Mo.forEach=Lo}}var Uo=Xt("iterator"),zo=Xt("toStringTag"),qo=Mi.values;for(var Wo in Bo){var Go=o[Wo],Ko=Go&&Go.prototype;if(Ko){if(Ko[Uo]!==qo)try{A(Ko,Uo,qo)}catch(t){Ko[Uo]=qo}if(Ko[zo]||A(Ko,zo,Wo),Bo[Wo])for(var Jo in Mi)if(Ko[Jo]!==Mi[Jo])try{A(Ko,Jo,Mi[Jo])}catch(t){Ko[Jo]=Mi[Jo]}}}function Yo(t){return(Yo="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function Xo(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function Qo(t,e){for(var i=0;i<e.length;i++){var n=e[i];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function Zo(t,e,i){return e&&Qo(t.prototype,e),i&&Qo(t,i),t}function tr(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){if(!(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t)))return;var i=[],n=!0,o=!1,r=void 0;try{for(var a,s=t[Symbol.iterator]();!(n=(a=s.next()).done)&&(i.push(a.value),!e||i.length!==e);n=!0);}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}return i}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function er(t){return function(t){if(Array.isArray(t)){for(var e=0,i=new Array(t.length);e<t.length;e++)i[e]=t[e];return i}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}var ir=4;try{var nr=t.fn.dropdown.Constructor.VERSION;void 0!==nr&&(ir=parseInt(nr,10))}catch(t){}var or={3:{iconsPrefix:"glyphicon",icons:{paginationSwitchDown:"glyphicon-collapse-down icon-chevron-down",paginationSwitchUp:"glyphicon-collapse-up icon-chevron-up",refresh:"glyphicon-refresh icon-refresh",toggleOff:"glyphicon-list-alt icon-list-alt",toggleOn:"glyphicon-list-alt icon-list-alt",columns:"glyphicon-th icon-th",detailOpen:"glyphicon-plus icon-plus",detailClose:"glyphicon-minus icon-minus",fullscreen:"glyphicon-fullscreen",search:"glyphicon-search",clearSearch:"glyphicon-trash"},classes:{buttonsPrefix:"btn",buttons:"default",buttonsGroup:"btn-group",buttonsDropdown:"btn-group",pull:"pull",inputGroup:"input-group",inputPrefix:"input-",input:"form-control",paginationDropdown:"btn-group dropdown",dropup:"dropup",dropdownActive:"active",paginationActive:"active",buttonActive:"active"},html:{toolbarDropdown:['<ul class="dropdown-menu" role="menu">',"</ul>"],toolbarDropdownItem:'<li class="dropdown-item-marker" role="menuitem"><label>%s</label></li>',toolbarDropdownSeparator:'<li class="divider"></li>',pageDropdown:['<ul class="dropdown-menu" role="menu">',"</ul>"],pageDropdownItem:'<li role="menuitem" class="%s"><a href="#">%s</a></li>',dropdownCaret:'<span class="caret"></span>',pagination:['<ul class="pagination%s">',"</ul>"],paginationItem:'<li class="page-item%s"><a class="page-link" aria-label="%s" href="javascript:void(0)">%s</a></li>',icon:'<i class="%s %s"></i>',inputGroup:'<div class="input-group">%s<span class="input-group-btn">%s</span></div>',searchInput:'<input class="%s%s" type="text" placeholder="%s">',searchButton:'<button class="%s" type="button" name="search" title="%s">%s %s</button>',searchClearButton:'<button class="%s" type="button" name="clearSearch" title="%s">%s %s</button>'}},4:{iconsPrefix:"fa",icons:{paginationSwitchDown:"fa-caret-square-down",paginationSwitchUp:"fa-caret-square-up",refresh:"fa-sync",toggleOff:"fa-toggle-off",toggleOn:"fa-toggle-on",columns:"fa-th-list",detailOpen:"fa-plus",detailClose:"fa-minus",fullscreen:"fa-arrows-alt",search:"fa-search",clearSearch:"fa-trash"},classes:{buttonsPrefix:"btn",buttons:"secondary",buttonsGroup:"btn-group",buttonsDropdown:"btn-group",pull:"float",inputGroup:"btn-group",inputPrefix:"form-control-",input:"form-control",paginationDropdown:"btn-group dropdown",dropup:"dropup",dropdownActive:"active",paginationActive:"active",buttonActive:"active"},html:{toolbarDropdown:['<div class="dropdown-menu dropdown-menu-right">',"</div>"],toolbarDropdownItem:'<label class="dropdown-item dropdown-item-marker">%s</label>',pageDropdown:['<div class="dropdown-menu">',"</div>"],pageDropdownItem:'<a class="dropdown-item %s" href="#">%s</a>',toolbarDropdownSeparator:'<div class="dropdown-divider"></div>',dropdownCaret:'<span class="caret"></span>',pagination:['<ul class="pagination%s">',"</ul>"],paginationItem:'<li class="page-item%s"><a class="page-link" aria-label="%s" href="javascript:void(0)">%s</a></li>',icon:'<i class="%s %s"></i>',inputGroup:'<div class="input-group">%s<div class="input-group-append">%s</div></div>',searchInput:'<input class="%s%s" type="text" placeholder="%s">',searchButton:'<button class="%s" type="button" name="search" title="%s">%s %s</button>',searchClearButton:'<button class="%s" type="button" name="clearSearch" title="%s">%s %s</button>'}}}[ir],rr={height:void 0,classes:"table table-bordered table-hover",theadClasses:"",headerStyle:function(t){return{}},rowStyle:function(t,e){return{}},rowAttributes:function(t,e){return{}},undefinedText:"-",locale:void 0,virtualScroll:!1,virtualScrollItemHeight:void 0,sortable:!0,sortClass:void 0,silentSort:!0,sortName:void 0,sortOrder:"asc",sortStable:!1,rememberOrder:!1,serverSort:!0,customSort:void 0,columns:[[]],data:[],url:void 0,method:"get",cache:!0,contentType:"application/json",dataType:"json",ajax:void 0,ajaxOptions:{},queryParams:function(t){return t},queryParamsType:"limit",responseHandler:function(t){return t},totalField:"total",totalNotFilteredField:"totalNotFiltered",dataField:"rows",pagination:!1,onlyInfoPagination:!1,showExtendedPagination:!1,paginationLoop:!0,sidePagination:"client",totalRows:0,totalNotFiltered:0,pageNumber:1,pageSize:10,pageList:[10,25,50,100],paginationHAlign:"right",paginationVAlign:"bottom",paginationDetailHAlign:"left",paginationPreText:"&lsaquo;",paginationNextText:"&rsaquo;",paginationSuccessivelySize:5,paginationPagesBySide:1,paginationUseIntermediate:!1,search:!1,searchOnEnterKey:!1,strictSearch:!1,visibleSearch:!1,showButtonIcons:!0,showButtonText:!1,showSearchButton:!1,showSearchClearButton:!1,trimOnSearch:!0,searchAlign:"right",searchTimeOut:500,searchText:"",customSearch:void 0,showHeader:!0,showFooter:!1,footerStyle:function(t){return{}},showColumns:!1,showColumnsToggleAll:!1,showColumnsSearch:!1,minimumCountColumns:1,showPaginationSwitch:!1,showRefresh:!1,showToggle:!1,showFullscreen:!1,smartDisplay:!0,escape:!1,filterOptions:{filterAlgorithm:"and"},idField:void 0,selectItemName:"btSelectItem",clickToSelect:!1,ignoreClickToSelectOn:function(t){var e=t.tagName;return["A","BUTTON"].includes(e)},singleSelect:!1,checkboxHeader:!0,maintainMetaData:!1,multipleSelectRow:!1,uniqueId:void 0,cardView:!1,detailView:!1,detailViewIcon:!0,detailViewByClick:!1,detailFormatter:function(t,e){return""},detailFilter:function(t,e){return!0},toolbar:void 0,toolbarAlign:"left",buttonsToolbar:void 0,buttonsAlign:"right",buttonsOrder:["paginationSwitch","refresh","toggle","fullscreen","columns"],buttonsPrefix:or.classes.buttonsPrefix,buttonsClass:or.classes.buttons,icons:or.icons,html:or.html,iconSize:void 0,iconsPrefix:or.iconsPrefix,onAll:function(t,e){return!1},onClickCell:function(t,e,i,n){return!1},onDblClickCell:function(t,e,i,n){return!1},onClickRow:function(t,e){return!1},onDblClickRow:function(t,e){return!1},onSort:function(t,e){return!1},onCheck:function(t){return!1},onUncheck:function(t){return!1},onCheckAll:function(t){return!1},onUncheckAll:function(t){return!1},onCheckSome:function(t){return!1},onUncheckSome:function(t){return!1},onLoadSuccess:function(t){return!1},onLoadError:function(t){return!1},onColumnSwitch:function(t,e){return!1},onPageChange:function(t,e){return!1},onSearch:function(t){return!1},onToggle:function(t){return!1},onPreBody:function(t){return!1},onPostBody:function(){return!1},onPostHeader:function(){return!1},onPostFooter:function(){return!1},onExpandRow:function(t,e,i){return!1},onCollapseRow:function(t,e){return!1},onRefreshOptions:function(t){return!1},onRefresh:function(t){return!1},onResetView:function(){return!1},onScrollBody:function(){return!1}},ar={formatLoadingMessage:function(){return"Loading, please wait"},formatRecordsPerPage:function(t){return"".concat(t," rows per page")},formatShowingRows:function(t,e,i,n){return void 0!==n&&n>0&&n>i?"Showing ".concat(t," to ").concat(e," of ").concat(i," rows (filtered from ").concat(n," total rows)"):"Showing ".concat(t," to ").concat(e," of ").concat(i," rows")},formatSRPaginationPreText:function(){return"previous page"},formatSRPaginationPageText:function(t){return"to page ".concat(t)},formatSRPaginationNextText:function(){return"next page"},formatDetailPagination:function(t){return"Showing ".concat(t," rows")},formatSearch:function(){return"Search"},formatClearSearch:function(){return"Clear Search"},formatNoMatches:function(){return"No matching records found"},formatPaginationSwitch:function(){return"Hide/Show pagination"},formatPaginationSwitchDown:function(){return"Show pagination"},formatPaginationSwitchUp:function(){return"Hide pagination"},formatRefresh:function(){return"Refresh"},formatToggle:function(){return"Toggle"},formatToggleOn:function(){return"Show card view"},formatToggleOff:function(){return"Hide card view"},formatColumns:function(){return"Columns"},formatColumnsToggleAll:function(){return"Toggle all"},formatFullscreen:function(){return"Fullscreen"},formatAllRows:function(){return"All"}},sr={field:void 0,title:void 0,titleTooltip:void 0,class:void 0,width:void 0,widthUnit:"px",rowspan:void 0,colspan:void 0,align:void 0,halign:void 0,falign:void 0,valign:void 0,cellStyle:void 0,radio:!1,checkbox:!1,checkboxEnabled:!0,clickToSelect:!0,showSelectTitle:!1,sortable:!1,sortName:void 0,order:"asc",sorter:void 0,visible:!0,switchable:!0,cardVisible:!0,searchable:!0,formatter:void 0,footerFormatter:void 0,detailFormatter:void 0,searchFormatter:!0,escape:!1,events:void 0};Object.assign(rr,ar);var lr={VERSION:"1.16.0",THEME:"bootstrap".concat(ir),CONSTANTS:or,DEFAULTS:rr,COLUMN_DEFAULTS:sr,METHODS:["getOptions","refreshOptions","getData","getSelections","getAllSelections","load","append","prepend","remove","removeAll","insertRow","updateRow","getRowByUniqueId","updateByUniqueId","removeByUniqueId","updateCell","updateCellByUniqueId","showRow","hideRow","getHiddenRows","showColumn","hideColumn","getVisibleColumns","getHiddenColumns","showAllColumns","hideAllColumns","mergeCells","checkAll","uncheckAll","checkInvert","check","uncheck","checkBy","uncheckBy","refresh","destroy","resetView","showLoading","hideLoading","togglePagination","toggleFullscreen","toggleView","resetSearch","filterBy","scrollTo","getScrollPosition","selectPage","prevPage","nextPage","toggleDetailView","expandRow","collapseRow","expandAllRows","collapseAllRows","updateColumnTitle","updateFormatText"],EVENTS:{"all.bs.table":"onAll","click-row.bs.table":"onClickRow","dbl-click-row.bs.table":"onDblClickRow","click-cell.bs.table":"onClickCell","dbl-click-cell.bs.table":"onDblClickCell","sort.bs.table":"onSort","check.bs.table":"onCheck","uncheck.bs.table":"onUncheck","check-all.bs.table":"onCheckAll","uncheck-all.bs.table":"onUncheckAll","check-some.bs.table":"onCheckSome","uncheck-some.bs.table":"onUncheckSome","load-success.bs.table":"onLoadSuccess","load-error.bs.table":"onLoadError","column-switch.bs.table":"onColumnSwitch","page-change.bs.table":"onPageChange","search.bs.table":"onSearch","toggle.bs.table":"onToggle","pre-body.bs.table":"onPreBody","post-body.bs.table":"onPostBody","post-header.bs.table":"onPostHeader","post-footer.bs.table":"onPostFooter","expand-row.bs.table":"onExpandRow","collapse-row.bs.table":"onCollapseRow","refresh-options.bs.table":"onRefreshOptions","reset-view.bs.table":"onResetView","refresh.bs.table":"onRefresh","scroll-body.bs.table":"onScrollBody"},LOCALES:{en:ar,"en-US":ar}},cr=r((function(){_t(1)}));Et({target:"Object",stat:!0,forced:cr},{keys:function(t){return _t(Ft(t))}});var hr={sprintf:function(t){for(var e=arguments.length,i=new Array(e>1?e-1:0),n=1;n<e;n++)i[n-1]=arguments[n];var o=!0,r=0,a=t.replace(/%s/g,(function(){var t=i[r++];return void 0===t?(o=!1,""):t}));return o?a:""},isEmptyObject:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return 0===Object.entries(t).length&&t.constructor===Object},isNumeric:function(t){return!isNaN(parseFloat(t))&&isFinite(t)},getFieldTitle:function(t,e){var i=!0,n=!1,o=void 0;try{for(var r,a=t[Symbol.iterator]();!(i=(r=a.next()).done);i=!0){var s=r.value;if(s.field===e)return s.title}}catch(t){n=!0,o=t}finally{try{i||null==a.return||a.return()}finally{if(n)throw o}}return""},setFieldIndex:function(t){var e=0,i=[],n=!0,o=!1,r=void 0;try{for(var a,s=t[0][Symbol.iterator]();!(n=(a=s.next()).done);n=!0){e+=a.value.colspan||1}}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}for(var l=0;l<t.length;l++){i[l]=[];for(var c=0;c<e;c++)i[l][c]=!1}for(var h=0;h<t.length;h++){var u=!0,d=!1,f=void 0;try{for(var p,g=t[h][Symbol.iterator]();!(u=(p=g.next()).done);u=!0){var v=p.value,b=v.rowspan||1,m=v.colspan||1,y=i[h].indexOf(!1);v.colspanIndex=y,1===m?(v.fieldIndex=y,void 0===v.field&&(v.field=y)):v.colspanGroup=v.colspan;for(var w=0;w<b;w++)i[h+w][y]=!0;for(var S=0;S<m;S++)i[h][y+S]=!0}}catch(t){d=!0,f=t}finally{try{u||null==g.return||g.return()}finally{if(d)throw f}}}},updateFieldGroup:function(t){var e,i=(e=[]).concat.apply(e,er(t)),n=!0,o=!1,r=void 0;try{for(var a,s=t[Symbol.iterator]();!(n=(a=s.next()).done);n=!0){var l=a.value,c=!0,h=!1,u=void 0;try{for(var d,f=l[Symbol.iterator]();!(c=(d=f.next()).done);c=!0){var p=d.value;if(p.colspanGroup>1){for(var g=0,v=function(t){i.find((function(e){return e.fieldIndex===t})).visible&&g++},b=p.colspanIndex;b<p.colspanIndex+p.colspanGroup;b++)v(b);p.colspan=g,p.visible=g>0}}}catch(t){h=!0,u=t}finally{try{c||null==f.return||f.return()}finally{if(h)throw u}}}}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}},getScrollBarWidth:function(){if(void 0===this.cachedWidth){var e=t("<div/>").addClass("fixed-table-scroll-inner"),i=t("<div/>").addClass("fixed-table-scroll-outer");i.append(e),t("body").append(i);var n=e[0].offsetWidth;i.css("overflow","scroll");var o=e[0].offsetWidth;n===o&&(o=i[0].clientWidth),i.remove(),this.cachedWidth=n-o}return this.cachedWidth},calculateObjectValue:function(t,e,i,n){var o=e;if("string"==typeof e){var r=e.split(".");if(r.length>1){o=window;var a=!0,s=!1,l=void 0;try{for(var c,h=r[Symbol.iterator]();!(a=(c=h.next()).done);a=!0){o=o[c.value]}}catch(t){s=!0,l=t}finally{try{a||null==h.return||h.return()}finally{if(s)throw l}}}else o=window[e]}return null!==o&&"object"===Yo(o)?o:"function"==typeof o?o.apply(t,i||[]):!o&&"string"==typeof e&&this.sprintf.apply(this,[e].concat(er(i)))?this.sprintf.apply(this,[e].concat(er(i))):n},compareObjects:function(t,e,i){var n=Object.keys(t),o=Object.keys(e);if(i&&n.length!==o.length)return!1;for(var r=0,a=n;r<a.length;r++){var s=a[r];if(o.includes(s)&&t[s]!==e[s])return!1}return!0},escapeHTML:function(t){return"string"==typeof t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/`/g,"&#x60;"):t},getRealDataAttr:function(t){for(var e=0,i=Object.entries(t);e<i.length;e++){var n=tr(i[e],2),o=n[0],r=n[1],a=o.split(/(?=[A-Z])/).join("-").toLowerCase();a!==o&&(t[a]=r,delete t[o])}return t},getItemField:function(t,e,i){var n=t;if("string"!=typeof e||t.hasOwnProperty(e))return i?this.escapeHTML(t[e]):t[e];var o=e.split("."),r=!0,a=!1,s=void 0;try{for(var l,c=o[Symbol.iterator]();!(r=(l=c.next()).done);r=!0){var h=l.value;n=n&&n[h]}}catch(t){a=!0,s=t}finally{try{r||null==c.return||c.return()}finally{if(a)throw s}}return i?this.escapeHTML(n):n},isIEBrowser:function(){return navigator.userAgent.includes("MSIE ")||/Trident.*rv:11\./.test(navigator.userAgent)},findIndex:function(t,e){var i=!0,n=!1,o=void 0;try{for(var r,a=t[Symbol.iterator]();!(i=(r=a.next()).done);i=!0){var s=r.value;if(JSON.stringify(s)===JSON.stringify(e))return t.indexOf(s)}}catch(t){n=!0,o=t}finally{try{i||null==a.return||a.return()}finally{if(n)throw o}}return-1},trToData:function(e,i){var n=this,o=[],r=[];return i.each((function(i,a){var s={};s._id=t(a).attr("id"),s._class=t(a).attr("class"),s._data=n.getRealDataAttr(t(a).data()),t(a).find(">td,>th").each((function(o,a){for(var l=+t(a).attr("colspan")||1,c=+t(a).attr("rowspan")||1,h=o;r[i]&&r[i][h];h++);for(var u=h;u<h+l;u++)for(var d=i;d<i+c;d++)r[d]||(r[d]=[]),r[d][u]=!0;var f=e[h].field;s[f]=t(a).html().trim(),s["_".concat(f,"_id")]=t(a).attr("id"),s["_".concat(f,"_class")]=t(a).attr("class"),s["_".concat(f,"_rowspan")]=t(a).attr("rowspan"),s["_".concat(f,"_colspan")]=t(a).attr("colspan"),s["_".concat(f,"_title")]=t(a).attr("title"),s["_".concat(f,"_data")]=n.getRealDataAttr(t(a).data())})),o.push(s)})),o},sort:function(t,e,i,n,o,r){return null==t&&(t=""),null==e&&(e=""),n&&t===e&&(t=o,e=r),this.isNumeric(t)&&this.isNumeric(e)?(t=parseFloat(t))<(e=parseFloat(e))?-1*i:t>e?i:0:t===e?0:("string"!=typeof t&&(t=t.toString()),-1===t.localeCompare(e)?-1*i:i)},getResizeEventName:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return t=t||"".concat(+new Date).concat(~~(1e6*Math.random())),"resize.bootstrap-table-".concat(t)}},ur=function(){function t(e){var i=this;Xo(this,t),this.rows=e.rows,this.scrollEl=e.scrollEl,this.contentEl=e.contentEl,this.callback=e.callback,this.itemHeight=e.itemHeight,this.cache={},this.scrollTop=this.scrollEl.scrollTop,this.initDOM(this.rows,e.fixedScroll),this.scrollEl.scrollTop=this.scrollTop,this.lastCluster=0;var n=function(){i.lastCluster!==(i.lastCluster=i.getNum())&&(i.initDOM(i.rows),i.callback())};this.scrollEl.addEventListener("scroll",n,!1),this.destroy=function(){i.contentEl.innerHtml="",i.scrollEl.removeEventListener("scroll",n,!1)}}return Zo(t,[{key:"initDOM",value:function(t,e){void 0===this.clusterHeight&&(this.cache.scrollTop=this.scrollEl.scrollTop,this.cache.data=this.contentEl.innerHTML=t[0]+t[0]+t[0],this.getRowsHeight(t));var i=this.initData(t,this.getNum(e)),n=i.rows.join(""),o=this.checkChanges("data",n),r=this.checkChanges("top",i.topOffset),a=this.checkChanges("bottom",i.bottomOffset),s=[];o&&r?(i.topOffset&&s.push(this.getExtra("top",i.topOffset)),s.push(n),i.bottomOffset&&s.push(this.getExtra("bottom",i.bottomOffset)),this.contentEl.innerHTML=s.join(""),e&&(this.contentEl.scrollTop=this.cache.scrollTop)):a&&(this.contentEl.lastChild.style.height="".concat(i.bottomOffset,"px"))}},{key:"getRowsHeight",value:function(){if(void 0===this.itemHeight){var t=this.contentEl.children,e=t[Math.floor(t.length/2)];this.itemHeight=e.offsetHeight}this.blockHeight=50*this.itemHeight,this.clusterRows=200,this.clusterHeight=4*this.blockHeight}},{key:"getNum",value:function(t){return this.scrollTop=t?this.cache.scrollTop:this.scrollEl.scrollTop,Math.floor(this.scrollTop/(this.clusterHeight-this.blockHeight))||0}},{key:"initData",value:function(t,e){if(t.length<50)return{topOffset:0,bottomOffset:0,rowsAbove:0,rows:t};var i=Math.max((this.clusterRows-50)*e,0),n=i+this.clusterRows,o=Math.max(i*this.itemHeight,0),r=Math.max((t.length-n)*this.itemHeight,0),a=[],s=i;o<1&&s++;for(var l=i;l<n;l++)t[l]&&a.push(t[l]);return{topOffset:o,bottomOffset:r,rowsAbove:s,rows:a}}},{key:"checkChanges",value:function(t,e){var i=e!==this.cache[t];return this.cache[t]=e,i}},{key:"getExtra",value:function(t,e){var i=document.createElement("tr");return i.className="virtual-scroll-".concat(t),e&&(i.style.height="".concat(e,"px")),i.outerHTML}}]),t}(),dr=function(){function e(i,n){Xo(this,e),this.options=n,this.$el=t(i),this.$el_=this.$el.clone(),this.timeoutId_=0,this.timeoutFooter_=0,this.init()}return Zo(e,[{key:"init",value:function(){this.initConstants(),this.initLocale(),this.initContainer(),this.initTable(),this.initHeader(),this.initData(),this.initHiddenRows(),this.initToolbar(),this.initPagination(),this.initBody(),this.initSearchText(),this.initServer()}},{key:"initConstants",value:function(){var e=this.options;this.constants=lr.CONSTANTS,this.constants.theme=t.fn.bootstrapTable.theme;var i=e.buttonsPrefix?"".concat(e.buttonsPrefix,"-"):"";this.constants.buttonsClass=[e.buttonsPrefix,i+e.buttonsClass,hr.sprintf("".concat(i,"%s"),e.iconSize)].join(" ").trim()}},{key:"initLocale",value:function(){if(this.options.locale){var e=t.fn.bootstrapTable.locales,i=this.options.locale.split(/-|_/);i[0]=i[0].toLowerCase(),i[1]&&(i[1]=i[1].toUpperCase()),e[this.options.locale]?t.extend(this.options,e[this.options.locale]):e[i.join("-")]?t.extend(this.options,e[i.join("-")]):e[i[0]]&&t.extend(this.options,e[i[0]])}}},{key:"initContainer",value:function(){var e=["top","both"].includes(this.options.paginationVAlign)?'<div class="fixed-table-pagination clearfix"></div>':"",i=["bottom","both"].includes(this.options.paginationVAlign)?'<div class="fixed-table-pagination"></div>':"";this.$container=t('\n      <div class="bootstrap-table '.concat(this.constants.theme,'">\n      <div class="fixed-table-toolbar"></div>\n      ').concat(e,'\n      <div class="fixed-table-container">\n      <div class="fixed-table-header"><table></table></div>\n      <div class="fixed-table-body">\n      <div class="fixed-table-loading">\n      <span class="loading-wrap">\n      <span class="loading-text">').concat(this.options.formatLoadingMessage(),'</span>\n      <span class="animation-wrap"><span class="animation-dot"></span></span>\n      </span>\n      </div>\n      </div>\n      <div class="fixed-table-footer"><table><thead><tr></tr></thead></table></div>\n      </div>\n      ').concat(i,"\n      </div>\n    ")),this.$container.insertAfter(this.$el),this.$tableContainer=this.$container.find(".fixed-table-container"),this.$tableHeader=this.$container.find(".fixed-table-header"),this.$tableBody=this.$container.find(".fixed-table-body"),this.$tableLoading=this.$container.find(".fixed-table-loading"),this.$tableFooter=this.$el.find("tfoot"),this.options.buttonsToolbar?this.$toolbar=t("body").find(this.options.buttonsToolbar):this.$toolbar=this.$container.find(".fixed-table-toolbar"),this.$pagination=this.$container.find(".fixed-table-pagination"),this.$tableBody.append(this.$el),this.$container.after('<div class="clearfix"></div>'),this.$el.addClass(this.options.classes),this.$tableLoading.addClass(this.options.classes),this.options.height&&(this.$tableContainer.addClass("fixed-height"),this.options.showFooter&&this.$tableContainer.addClass("has-footer"),this.options.classes.split(" ").includes("table-bordered")&&(this.$tableBody.append('<div class="fixed-table-border"></div>'),this.$tableBorder=this.$tableBody.find(".fixed-table-border"),this.$tableLoading.addClass("fixed-table-border")),this.$tableFooter=this.$container.find(".fixed-table-footer"))}},{key:"initTable",value:function(){var i=this,n=[];this.$header=this.$el.find(">thead"),this.$header.length?this.options.theadClasses&&this.$header.addClass(this.options.theadClasses):this.$header=t('<thead class="'.concat(this.options.theadClasses,'"></thead>')).appendTo(this.$el),this.$header.find("tr").each((function(e,i){var o=[];t(i).find("th").each((function(e,i){void 0!==t(i).data("field")&&t(i).data("field","".concat(t(i).data("field"))),o.push(t.extend({},{title:t(i).html(),class:t(i).attr("class"),titleTooltip:t(i).attr("title"),rowspan:t(i).attr("rowspan")?+t(i).attr("rowspan"):void 0,colspan:t(i).attr("colspan")?+t(i).attr("colspan"):void 0},t(i).data()))})),n.push(o)})),Array.isArray(this.options.columns[0])||(this.options.columns=[this.options.columns]),this.options.columns=t.extend(!0,[],n,this.options.columns),this.columns=[],this.fieldsColumnsIndex=[],hr.setFieldIndex(this.options.columns),this.options.columns.forEach((function(n,o){n.forEach((function(n,r){var a=t.extend({},e.COLUMN_DEFAULTS,n);void 0!==a.fieldIndex&&(i.columns[a.fieldIndex]=a,i.fieldsColumnsIndex[a.field]=a.fieldIndex),i.options.columns[o][r]=a}))})),this.options.data.length||(this.options.data=hr.trToData(this.columns,this.$el.find(">tbody>tr")),this.options.data.length&&(this.fromHtml=!0)),this.footerData=hr.trToData(this.columns,this.$el.find(">tfoot>tr")),this.footerData&&this.$el.find("tfoot").html("<tr></tr>"),!this.options.showFooter||this.options.cardView?this.$tableFooter.hide():this.$tableFooter.show()}},{key:"initHeader",value:function(){var e=this,i={},n=[];this.header={fields:[],styles:[],classes:[],formatters:[],detailFormatters:[],events:[],sorters:[],sortNames:[],cellStyles:[],searchables:[]},hr.updateFieldGroup(this.options.columns),this.options.columns.forEach((function(t,o){n.push("<tr>"),0===o&&!e.options.cardView&&e.options.detailView&&e.options.detailViewIcon&&n.push('<th class="detail" rowspan="'.concat(e.options.columns.length,'">\n          <div class="fht-cell"></div>\n          </th>\n        ')),t.forEach((function(t,r){var a=hr.sprintf(' class="%s"',t.class),s=t.widthUnit,l=parseFloat(t.width),c=hr.sprintf("text-align: %s; ",t.halign?t.halign:t.align),h=hr.sprintf("text-align: %s; ",t.align),u=hr.sprintf("vertical-align: %s; ",t.valign);if(u+=hr.sprintf("width: %s; ",!t.checkbox&&!t.radio||l?l?l+s:void 0:t.showSelectTitle?void 0:"36px"),void 0!==t.fieldIndex||t.visible){var d=hr.calculateObjectValue(null,e.options.headerStyle,[t]),f=[],p="";if(d&&d.css)for(var g=0,v=Object.entries(d.css);g<v.length;g++){var b=tr(v[g],2),m=b[0],y=b[1];f.push("".concat(m,": ").concat(y))}if(d&&d.classes&&(p=hr.sprintf(' class="%s"',t.class?[t.class,d.classes].join(" "):d.classes)),void 0!==t.fieldIndex){if(e.header.fields[t.fieldIndex]=t.field,e.header.styles[t.fieldIndex]=h+u,e.header.classes[t.fieldIndex]=a,e.header.formatters[t.fieldIndex]=t.formatter,e.header.detailFormatters[t.fieldIndex]=t.detailFormatter,e.header.events[t.fieldIndex]=t.events,e.header.sorters[t.fieldIndex]=t.sorter,e.header.sortNames[t.fieldIndex]=t.sortName,e.header.cellStyles[t.fieldIndex]=t.cellStyle,e.header.searchables[t.fieldIndex]=t.searchable,!t.visible)return;if(e.options.cardView&&!t.cardVisible)return;i[t.field]=t}n.push("<th".concat(hr.sprintf(' title="%s"',t.titleTooltip)),t.checkbox||t.radio?hr.sprintf(' class="bs-checkbox %s"',t.class||""):p||a,hr.sprintf(' style="%s"',c+u+f.join("; ")),hr.sprintf(' rowspan="%s"',t.rowspan),hr.sprintf(' colspan="%s"',t.colspan),hr.sprintf(' data-field="%s"',t.field),0===r&&o>0?" data-not-first-th":"",">"),n.push(hr.sprintf('<div class="th-inner %s">',e.options.sortable&&t.sortable?"sortable both":""));var w=e.options.escape?hr.escapeHTML(t.title):t.title,S=w;t.checkbox&&(w="",!e.options.singleSelect&&e.options.checkboxHeader&&(w='<label><input name="btSelectAll" type="checkbox" /><span></span></label>'),e.header.stateField=t.field),t.radio&&(w="",e.header.stateField=t.field),!w&&t.showSelectTitle&&(w+=S),n.push(w),n.push("</div>"),n.push('<div class="fht-cell"></div>'),n.push("</div>"),n.push("</th>")}})),n.push("</tr>")})),this.$header.html(n.join("")),this.$header.find("th[data-field]").each((function(e,n){t(n).data(i[t(n).data("field")])})),this.$container.off("click",".th-inner").on("click",".th-inner",(function(i){var n=t(i.currentTarget);if(e.options.detailView&&!n.parent().hasClass("bs-checkbox")&&n.closest(".bootstrap-table")[0]!==e.$container[0])return!1;e.options.sortable&&n.parent().data().sortable&&e.onSort(i)})),this.$header.children().children().off("keypress").on("keypress",(function(i){e.options.sortable&&t(i.currentTarget).data().sortable&&(13===(i.keyCode||i.which)&&e.onSort(i))}));var o=hr.getResizeEventName(this.$el.attr("id"));t(window).off(o),!this.options.showHeader||this.options.cardView?(this.$header.hide(),this.$tableHeader.hide(),this.$tableLoading.css("top",0)):(this.$header.show(),this.$tableHeader.show(),this.$tableLoading.css("top",this.$header.outerHeight()+1),this.getCaret(),t(window).on(o,(function(){return e.resetView()}))),this.$selectAll=this.$header.find('[name="btSelectAll"]'),this.$selectAll.off("click").on("click",(function(i){i.stopPropagation();var n=t(i.currentTarget).prop("checked");e[n?"checkAll":"uncheckAll"](),e.updateSelected()}))}},{key:"initData",value:function(t,e){this.options.data="append"===e?this.options.data.concat(t):"prepend"===e?[].concat(t).concat(this.options.data):t||this.options.data,this.data=this.options.data,"server"!==this.options.sidePagination&&this.initSort()}},{key:"initSort",value:function(){var t=this,e=this.options.sortName,i="desc"===this.options.sortOrder?-1:1,n=this.header.fields.indexOf(this.options.sortName),o=0;-1!==n&&(this.options.sortStable&&this.data.forEach((function(t,e){t.hasOwnProperty("_position")||(t._position=e)})),this.options.customSort?hr.calculateObjectValue(this.options,this.options.customSort,[this.options.sortName,this.options.sortOrder,this.data]):this.data.sort((function(o,r){t.header.sortNames[n]&&(e=t.header.sortNames[n]);var a=hr.getItemField(o,e,t.options.escape),s=hr.getItemField(r,e,t.options.escape),l=hr.calculateObjectValue(t.header,t.header.sorters[n],[a,s,o,r]);return void 0!==l?t.options.sortStable&&0===l?i*(o._position-r._position):i*l:hr.sort(a,s,i,t.options.sortStable,o._position,r._position)})),void 0!==this.options.sortClass&&(clearTimeout(o),o=setTimeout((function(){t.$el.removeClass(t.options.sortClass);var e=t.$header.find('[data-field="'.concat(t.options.sortName,'"]')).index();t.$el.find("tr td:nth-child(".concat(e+1,")")).addClass(t.options.sortClass)}),250)))}},{key:"onSort",value:function(e){var i=e.type,n=e.currentTarget,o="keypress"===i?t(n):t(n).parent(),r=this.$header.find("th").eq(o.index());if(this.$header.add(this.$header_).find("span.order").remove(),this.options.sortName===o.data("field")?this.options.sortOrder="asc"===this.options.sortOrder?"desc":"asc":(this.options.sortName=o.data("field"),this.options.rememberOrder?this.options.sortOrder="asc"===o.data("order")?"desc":"asc":this.options.sortOrder=this.columns[this.fieldsColumnsIndex[o.data("field")]].sortOrder||this.columns[this.fieldsColumnsIndex[o.data("field")]].order),this.trigger("sort",this.options.sortName,this.options.sortOrder),o.add(r).data("order",this.options.sortOrder),this.getCaret(),"server"===this.options.sidePagination&&this.options.serverSort)return this.options.pageNumber=1,void this.initServer(this.options.silentSort);this.initSort(),this.initBody()}},{key:"initToolbar",value:function(){var e,i=this,n=this.options,o=[],r=0,a=0;this.$toolbar.find(".bs-bars").children().length&&t("body").append(t(n.toolbar)),this.$toolbar.html(""),"string"!=typeof n.toolbar&&"object"!==Yo(n.toolbar)||t(hr.sprintf('<div class="bs-bars %s-%s"></div>',this.constants.classes.pull,n.toolbarAlign)).appendTo(this.$toolbar).append(t(n.toolbar)),o=['<div class="'.concat(["columns","columns-".concat(n.buttonsAlign),this.constants.classes.buttonsGroup,"".concat(this.constants.classes.pull,"-").concat(n.buttonsAlign)].join(" "),'">')],"string"==typeof n.icons&&(n.icons=hr.calculateObjectValue(null,n.icons));var s={paginationSwitch:'<button class="'.concat(this.constants.buttonsClass,'" type="button" name="paginationSwitch"\n        aria-label="Pagination Switch" title="').concat(n.formatPaginationSwitch(),'">\n        ').concat(n.showButtonIcons?hr.sprintf(this.constants.html.icon,n.iconsPrefix,n.icons.paginationSwitchDown):"","\n        ").concat(n.showButtonText?n.formatPaginationSwitchUp():"","\n        </button>"),refresh:'<button class="'.concat(this.constants.buttonsClass,'" type="button" name="refresh"\n        aria-label="Refresh" title="').concat(n.formatRefresh(),'">\n        ').concat(n.showButtonIcons?hr.sprintf(this.constants.html.icon,n.iconsPrefix,n.icons.refresh):"","\n        ").concat(n.showButtonText?n.formatRefresh():"","\n        </button>"),toggle:'<button class="'.concat(this.constants.buttonsClass,'" type="button" name="toggle"\n        aria-label="Toggle" title="').concat(n.formatToggle(),'">\n        ').concat(n.showButtonIcons?hr.sprintf(this.constants.html.icon,n.iconsPrefix,n.icons.toggleOff):"","\n        ").concat(n.showButtonText?n.formatToggleOn():"","\n        </button>"),fullscreen:'<button class="'.concat(this.constants.buttonsClass,'" type="button" name="fullscreen"\n        aria-label="Fullscreen" title="').concat(n.formatFullscreen(),'">\n        ').concat(n.showButtonIcons?hr.sprintf(this.constants.html.icon,n.iconsPrefix,n.icons.fullscreen):"","\n        ").concat(n.showButtonText?n.formatFullscreen():"","\n        </button>"),columns:function(){var t=[];if(t.push('<div class="keep-open '.concat(i.constants.classes.buttonsDropdown,'" title="').concat(n.formatColumns(),'">\n          <button class="').concat(i.constants.buttonsClass,' dropdown-toggle" type="button" data-toggle="dropdown"\n          aria-label="Columns" title="').concat(n.formatColumns(),'">\n          ').concat(n.showButtonIcons?hr.sprintf(i.constants.html.icon,n.iconsPrefix,n.icons.columns):"","\n          ").concat(n.showButtonText?n.formatColumns():"","\n          ").concat(i.constants.html.dropdownCaret,"\n          </button>\n          ").concat(i.constants.html.toolbarDropdown[0])),n.showColumnsSearch&&(t.push(hr.sprintf(i.constants.html.toolbarDropdownItem,hr.sprintf('<input type="text" class="%s" id="columnsSearch" placeholder="%s" autocomplete="off">',i.constants.classes.input,n.formatSearch()))),t.push(i.constants.html.toolbarDropdownSeparator)),n.showColumnsToggleAll){var e=i.getVisibleColumns().length===i.columns.filter((function(t){return!i.isSelectionColumn(t)})).length;t.push(hr.sprintf(i.constants.html.toolbarDropdownItem,hr.sprintf('<input type="checkbox" class="toggle-all" %s> <span>%s</span>',e?'checked="checked"':"",n.formatColumnsToggleAll()))),t.push(i.constants.html.toolbarDropdownSeparator)}var o=0;return i.columns.forEach((function(t,e){t.visible&&o++})),i.columns.forEach((function(e,r){if(!i.isSelectionColumn(e)&&(!n.cardView||e.cardVisible)){var s=e.visible?' checked="checked"':"",l=o<=i.options.minimumCountColumns&&s?' disabled="disabled"':"";e.switchable&&(t.push(hr.sprintf(i.constants.html.toolbarDropdownItem,hr.sprintf('<input type="checkbox" data-field="%s" value="%s"%s%s> <span>%s</span>',e.field,r,s,l,e.title))),a++)}})),t.push(i.constants.html.toolbarDropdown[1],"</div>"),t.join("")}()};"string"==typeof n.buttonsOrder&&(n.buttonsOrder=n.buttonsOrder.replace(/\[|\]| |'/g,"").toLowerCase().split(","));var l=!0,c=!1,h=void 0;try{for(var u,d=n.buttonsOrder[Symbol.iterator]();!(l=(u=d.next()).done);l=!0){var f=u.value;n["show"+f.charAt(0).toUpperCase()+f.substring(1)]&&o.push(s[f])}}catch(t){c=!0,h=t}finally{try{l||null==d.return||d.return()}finally{if(c)throw h}}if(o.push("</div>"),(this.showToolbar||o.length>2)&&this.$toolbar.append(o.join("")),n.showPaginationSwitch&&this.$toolbar.find('button[name="paginationSwitch"]').off("click").on("click",(function(){return i.togglePagination()})),n.showFullscreen&&this.$toolbar.find('button[name="fullscreen"]').off("click").on("click",(function(){return i.toggleFullscreen()})),n.showRefresh&&this.$toolbar.find('button[name="refresh"]').off("click").on("click",(function(){return i.refresh()})),n.showToggle&&this.$toolbar.find('button[name="toggle"]').off("click").on("click",(function(){i.toggleView()})),n.showColumns){var p=(e=this.$toolbar.find(".keep-open")).find('input[type="checkbox"]:not(".toggle-all")'),g=e.find('input[type="checkbox"].toggle-all');if(a<=n.minimumCountColumns&&e.find("input").prop("disabled",!0),e.find("li, label").off("click").on("click",(function(t){t.stopImmediatePropagation()})),p.off("click").on("click",(function(e){var n=e.currentTarget,o=t(n);i._toggleColumn(o.val(),o.prop("checked"),!1),i.trigger("column-switch",o.data("field"),o.prop("checked")),g.prop("checked",p.filter(":checked").length===i.columns.filter((function(t){return!i.isSelectionColumn(t)})).length)})),g.off("click").on("click",(function(e){var n=e.currentTarget;i._toggleAllColumns(t(n).prop("checked"))})),n.showColumnsSearch){var v=e.find("#columnsSearch"),b=e.find(".dropdown-item-marker");v.on("keyup paste change",(function(e){var i=e.currentTarget,n=t(i).val().toLowerCase();b.show(),p.each((function(e,i){var o=t(i).parents(".dropdown-item-marker");o.text().toLowerCase().includes(n)||o.hide()}))}))}}if(n.search||this.showSearchClearButton){o=[];var m=hr.sprintf(this.constants.html.searchButton,this.constants.buttonsClass,n.formatSearch(),n.showButtonIcons?hr.sprintf(this.constants.html.icon,n.iconsPrefix,n.icons.search):"",n.showButtonText?n.formatSearch():""),y=hr.sprintf(this.constants.html.searchClearButton,this.constants.buttonsClass,n.formatClearSearch(),n.showButtonIcons?hr.sprintf(this.constants.html.icon,n.iconsPrefix,n.icons.clearSearch):"",n.showButtonText?n.formatClearSearch():""),w='<input class="'.concat(this.constants.classes.input,"\n        ").concat(hr.sprintf(" %s%s",this.constants.classes.inputPrefix,n.iconSize),'\n        search-input" type="text" placeholder="').concat(n.formatSearch(),'" autocomplete="off">'),S=w;if(n.showSearchButton||n.showSearchClearButton){var x=(n.showSearchButton?m:"")+(n.showSearchClearButton?y:"");S=n.search?hr.sprintf(this.constants.html.inputGroup,w,x):x}o.push(hr.sprintf('\n        <div class="'.concat(this.constants.classes.pull,"-").concat(n.searchAlign," search ").concat(this.constants.classes.inputGroup,'">\n          %s\n        </div>\n      '),S)),this.$toolbar.append(o.join(""));var k=this.$toolbar.find(".search input"),O=function(){var t="keyup drop blur ".concat(hr.isIEBrowser()?"mouseup":"");k.off(t).on(t,(function(t){n.searchOnEnterKey&&13!==t.keyCode||[37,38,39,40].includes(t.keyCode)||(clearTimeout(r),r=setTimeout((function(){i.onSearch({currentTarget:t.currentTarget})}),n.searchTimeOut))}))};n.showSearchButton?(this.$toolbar.find(".search button[name=search]").off("click").on("click",(function(t){clearTimeout(r),r=setTimeout((function(){i.onSearch({currentTarget:k})}),n.searchTimeOut)})),n.searchOnEnterKey&&O()):O(),n.showSearchClearButton&&this.$toolbar.find(".search button[name=clearSearch]").click((function(){i.resetSearch()}))}}},{key:"onSearch",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},i=e.currentTarget,n=e.firedByInitSearchText,o=!(arguments.length>1&&void 0!==arguments[1])||arguments[1];if(void 0!==i&&t(i).length&&o){var r=t(i).val().trim();if(this.options.trimOnSearch&&t(i).val()!==r&&t(i).val(r),this.searchText===r&&r.length>0)return;t(i).hasClass("search-input")&&(this.searchText=r,this.options.searchText=r)}n||(this.options.pageNumber=1),this.initSearch(),n?"client"===this.options.sidePagination&&this.updatePagination():this.updatePagination(),this.trigger("search",this.searchText)}},{key:"initSearch",value:function(){var t=this;if(this.filterOptions=this.filterOptions||this.options.filterOptions,"server"!==this.options.sidePagination){if(this.options.customSearch)return void(this.data=hr.calculateObjectValue(this.options,this.options.customSearch,[this.options.data,this.searchText,this.filterColumns]));var e=this.searchText&&(this.fromHtml?hr.escapeHTML(this.searchText):this.searchText).toLowerCase(),i=hr.isEmptyObject(this.filterColumns)?null:this.filterColumns;"function"==typeof this.filterOptions.filterAlgorithm?this.data=this.options.data.filter((function(e,n){return t.filterOptions.filterAlgorithm.apply(null,[e,i])})):"string"==typeof this.filterOptions.filterAlgorithm&&(this.data=i?this.options.data.filter((function(e,n){var o=t.filterOptions.filterAlgorithm;if("and"===o){for(var r in i)if(Array.isArray(i[r])&&!i[r].includes(e[r])||!Array.isArray(i[r])&&e[r]!==i[r])return!1}else if("or"===o){var a=!1;for(var s in i)(Array.isArray(i[s])&&i[s].includes(e[s])||!Array.isArray(i[s])&&e[s]===i[s])&&(a=!0);return a}return!0})):this.options.data);var n=this.getVisibleFields();this.data=e?this.data.filter((function(i,o){for(var r=0;r<t.header.fields.length;r++)if(t.header.searchables[r]&&(!t.options.visibleSearch||-1!==n.indexOf(t.header.fields[r]))){var a=hr.isNumeric(t.header.fields[r])?parseInt(t.header.fields[r],10):t.header.fields[r],s=t.columns[t.fieldsColumnsIndex[a]],l=void 0;if("string"==typeof a){l=i;for(var c=a.split("."),h=0;h<c.length;h++)null!==l[c[h]]&&(l=l[c[h]])}else l=i[a];if(s&&s.searchFormatter&&(l=hr.calculateObjectValue(s,t.header.formatters[r],[l,i,o,s.field],l)),"string"==typeof l||"number"==typeof l)if(t.options.strictSearch){if("".concat(l).toLowerCase()===e)return!0}else{var u=/(?:(<=|=>|=<|>=|>|<)(?:\s+)?(\d+)?|(\d+)?(\s+)?(<=|=>|=<|>=|>|<))/gm.exec(e),d=!1;if(u){var f=u[1]||"".concat(u[5],"l"),p=u[2]||u[3],g=parseInt(l,10),v=parseInt(p,10);switch(f){case">":case"<l":d=g>v;break;case"<":case">l":d=g<v;break;case"<=":case"=<":case">=l":case"=>l":d=g<=v;break;case">=":case"=>":case"<=l":case"=<l":d=g>=v}}if(d||"".concat(l).toLowerCase().includes(e))return!0}}return!1})):this.data}this.initSort()}},{key:"initPagination",value:function(){var t=this,e=this.options;if(e.pagination){this.$pagination.show();var i,n,o,r,a,s,l,c=[],h=!1,u=this.getData({includeHiddenRows:!1}),d=e.pageList;"string"==typeof d&&(d=d.replace(/\[|\]| /g,"").toLowerCase().split(",")),d=d.map((function(t){return"string"==typeof t?t.toLowerCase()===e.formatAllRows().toLowerCase()||["all","unlimited"].includes(t.toLowerCase())?e.formatAllRows():+t:t})),"server"!==e.sidePagination&&(e.totalRows=u.length),this.totalPages=0,e.totalRows&&(e.pageSize===e.formatAllRows()&&(e.pageSize=e.totalRows,h=!0),this.totalPages=1+~~((e.totalRows-1)/e.pageSize),e.totalPages=this.totalPages),this.totalPages>0&&e.pageNumber>this.totalPages&&(e.pageNumber=this.totalPages),this.pageFrom=(e.pageNumber-1)*e.pageSize+1,this.pageTo=e.pageNumber*e.pageSize,this.pageTo>e.totalRows&&(this.pageTo=e.totalRows),this.options.pagination&&"server"!==this.options.sidePagination&&(this.options.totalNotFiltered=this.options.data.length),this.options.showExtendedPagination||(this.options.totalNotFiltered=void 0);var f=e.onlyInfoPagination?e.formatDetailPagination(e.totalRows):e.formatShowingRows(this.pageFrom,this.pageTo,e.totalRows,e.totalNotFiltered);if(c.push('<div class="'.concat(this.constants.classes.pull,"-").concat(e.paginationDetailHAlign,' pagination-detail">\n      <span class="pagination-info">\n      ').concat(f,"\n      </span>")),!e.onlyInfoPagination){c.push('<span class="page-list">');var p=['<span class="'.concat(this.constants.classes.paginationDropdown,'">\n        <button class="').concat(this.constants.buttonsClass,' dropdown-toggle" type="button" data-toggle="dropdown">\n        <span class="page-size">\n        ').concat(h?e.formatAllRows():e.pageSize,"\n        </span>\n        ").concat(this.constants.html.dropdownCaret,"\n        </button>\n        ").concat(this.constants.html.pageDropdown[0])];d.forEach((function(i,n){var o;(!e.smartDisplay||0===n||d[n-1]<e.totalRows)&&(o=h?i===e.formatAllRows()?t.constants.classes.dropdownActive:"":i===e.pageSize?t.constants.classes.dropdownActive:"",p.push(hr.sprintf(t.constants.html.pageDropdownItem,o,i)))})),p.push("".concat(this.constants.html.pageDropdown[1],"</span>")),c.push(e.formatRecordsPerPage(p.join(""))),c.push("</span></div>"),c.push('<div class="'.concat(this.constants.classes.pull,"-").concat(e.paginationHAlign,' pagination">'),hr.sprintf(this.constants.html.pagination[0],hr.sprintf(" pagination-%s",e.iconSize)),hr.sprintf(this.constants.html.paginationItem," page-pre",e.formatSRPaginationPreText(),e.paginationPreText)),this.totalPages<e.paginationSuccessivelySize?(n=1,o=this.totalPages):o=(n=e.pageNumber-e.paginationPagesBySide)+2*e.paginationPagesBySide,e.pageNumber<e.paginationSuccessivelySize-1&&(o=e.paginationSuccessivelySize),e.paginationSuccessivelySize>this.totalPages-n&&(n=n-(e.paginationSuccessivelySize-(this.totalPages-n))+1),n<1&&(n=1),o>this.totalPages&&(o=this.totalPages);var g=Math.round(e.paginationPagesBySide/2),v=function(i){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return hr.sprintf(t.constants.html.paginationItem,n+(i===e.pageNumber?" ".concat(t.constants.classes.paginationActive):""),e.formatSRPaginationPageText(i),i)};if(n>1){var b=e.paginationPagesBySide;for(b>=n&&(b=n-1),i=1;i<=b;i++)c.push(v(i));n-1===b+1?(i=n-1,c.push(v(i))):n-1>b&&(n-2*e.paginationPagesBySide>e.paginationPagesBySide&&e.paginationUseIntermediate?(i=Math.round((n-g)/2+g),c.push(v(i," page-intermediate"))):c.push(hr.sprintf(this.constants.html.paginationItem," page-first-separator disabled","","...")))}for(i=n;i<=o;i++)c.push(v(i));if(this.totalPages>o){var m=this.totalPages-(e.paginationPagesBySide-1);for(o>=m&&(m=o+1),o+1===m-1?(i=o+1,c.push(v(i))):m>o+1&&(this.totalPages-o>2*e.paginationPagesBySide&&e.paginationUseIntermediate?(i=Math.round((this.totalPages-g-o)/2+o),c.push(v(i," page-intermediate"))):c.push(hr.sprintf(this.constants.html.paginationItem," page-last-separator disabled","","..."))),i=m;i<=this.totalPages;i++)c.push(v(i))}c.push(hr.sprintf(this.constants.html.paginationItem," page-next",e.formatSRPaginationNextText(),e.paginationNextText)),c.push(this.constants.html.pagination[1],"</div>")}this.$pagination.html(c.join(""));var y=["bottom","both"].includes(e.paginationVAlign)?" ".concat(this.constants.classes.dropup):"";this.$pagination.last().find(".page-list > span").addClass(y),e.onlyInfoPagination||(r=this.$pagination.find(".page-list a"),a=this.$pagination.find(".page-pre"),s=this.$pagination.find(".page-next"),l=this.$pagination.find(".page-item").not(".page-next, .page-pre, .page-last-separator, .page-first-separator"),this.totalPages<=1&&this.$pagination.find("div.pagination").hide(),e.smartDisplay&&(d.length<2||e.totalRows<=d[0])&&this.$pagination.find("span.page-list").hide(),this.$pagination[this.getData().length?"show":"hide"](),e.paginationLoop||(1===e.pageNumber&&a.addClass("disabled"),e.pageNumber===this.totalPages&&s.addClass("disabled")),h&&(e.pageSize=e.formatAllRows()),r.off("click").on("click",(function(e){return t.onPageListChange(e)})),a.off("click").on("click",(function(e){return t.onPagePre(e)})),s.off("click").on("click",(function(e){return t.onPageNext(e)})),l.off("click").on("click",(function(e){return t.onPageNumber(e)})))}else this.$pagination.hide()}},{key:"updatePagination",value:function(e){e&&t(e.currentTarget).hasClass("disabled")||(this.options.maintainMetaData||this.resetRows(),this.initPagination(),"server"===this.options.sidePagination?this.initServer():this.initBody(),this.trigger("page-change",this.options.pageNumber,this.options.pageSize))}},{key:"onPageListChange",value:function(e){e.preventDefault();var i=t(e.currentTarget);return i.parent().addClass(this.constants.classes.dropdownActive).siblings().removeClass(this.constants.classes.dropdownActive),this.options.pageSize=i.text().toUpperCase()===this.options.formatAllRows().toUpperCase()?this.options.formatAllRows():+i.text(),this.$toolbar.find(".page-size").text(this.options.pageSize),this.updatePagination(e),!1}},{key:"onPagePre",value:function(t){return t.preventDefault(),this.options.pageNumber-1==0?this.options.pageNumber=this.options.totalPages:this.options.pageNumber--,this.updatePagination(t),!1}},{key:"onPageNext",value:function(t){return t.preventDefault(),this.options.pageNumber+1>this.options.totalPages?this.options.pageNumber=1:this.options.pageNumber++,this.updatePagination(t),!1}},{key:"onPageNumber",value:function(e){if(e.preventDefault(),this.options.pageNumber!==+t(e.currentTarget).text())return this.options.pageNumber=+t(e.currentTarget).text(),this.updatePagination(e),!1}},{key:"initRow",value:function(t,e,i,n){var o=this,r=[],a={},s=[],l="",c={},h=[];if(!(hr.findIndex(this.hiddenRows,t)>-1)){if((a=hr.calculateObjectValue(this.options,this.options.rowStyle,[t,e],a))&&a.css)for(var u=0,d=Object.entries(a.css);u<d.length;u++){var f=tr(d[u],2),p=f[0],g=f[1];s.push("".concat(p,": ").concat(g))}if(c=hr.calculateObjectValue(this.options,this.options.rowAttributes,[t,e],c))for(var v=0,b=Object.entries(c);v<b.length;v++){var m=tr(b[v],2),y=m[0],w=m[1];h.push("".concat(y,'="').concat(hr.escapeHTML(w),'"'))}if(t._data&&!hr.isEmptyObject(t._data))for(var S=0,x=Object.entries(t._data);S<x.length;S++){var k=tr(x[S],2),O=k[0],C=k[1];if("index"===O)return;l+=" data-".concat(O,"='").concat("object"===Yo(C)?JSON.stringify(C):C,"'")}return r.push("<tr",hr.sprintf(" %s",h.length?h.join(" "):void 0),hr.sprintf(' id="%s"',Array.isArray(t)?void 0:t._id),hr.sprintf(' class="%s"',a.classes||(Array.isArray(t)?void 0:t._class)),' data-index="'.concat(e,'"'),hr.sprintf(' data-uniqueid="%s"',hr.getItemField(t,this.options.uniqueId,!1)),hr.sprintf(' data-has-detail-view="%s"',!this.options.cardView&&this.options.detailView&&hr.calculateObjectValue(null,this.options.detailFilter,[e,t])?"true":void 0),hr.sprintf("%s",l),">"),this.options.cardView&&r.push('<td colspan="'.concat(this.header.fields.length,'"><div class="card-views">')),!this.options.cardView&&this.options.detailView&&this.options.detailViewIcon&&(r.push("<td>"),hr.calculateObjectValue(null,this.options.detailFilter,[e,t])&&r.push('\n          <a class="detail-icon" href="#">\n          '.concat(hr.sprintf(this.constants.html.icon,this.options.iconsPrefix,this.options.icons.detailOpen),"\n          </a>\n        ")),r.push("</td>")),this.header.fields.forEach((function(i,n){var a="",l=hr.getItemField(t,i,o.options.escape),c="",h="",u={},d="",f=o.header.classes[n],p="",g="",v="",b="",m="",y=o.columns[n];if((!o.fromHtml||void 0!==l||y.checkbox||y.radio)&&y.visible&&(!o.options.cardView||y.cardVisible)){if(y.escape&&(l=hr.escapeHTML(l)),s.concat([o.header.styles[n]]).length&&(p=' style="'.concat(s.concat([o.header.styles[n]]).join("; "),'"')),t["_".concat(i,"_id")]&&(d=hr.sprintf(' id="%s"',t["_".concat(i,"_id")])),t["_".concat(i,"_class")]&&(f=hr.sprintf(' class="%s"',t["_".concat(i,"_class")])),t["_".concat(i,"_rowspan")]&&(v=hr.sprintf(' rowspan="%s"',t["_".concat(i,"_rowspan")])),t["_".concat(i,"_colspan")]&&(b=hr.sprintf(' colspan="%s"',t["_".concat(i,"_colspan")])),t["_".concat(i,"_title")]&&(m=hr.sprintf(' title="%s"',t["_".concat(i,"_title")])),(u=hr.calculateObjectValue(o.header,o.header.cellStyles[n],[l,t,e,i],u)).classes&&(f=' class="'.concat(u.classes,'"')),u.css){for(var w=[],S=0,x=Object.entries(u.css);S<x.length;S++){var k=tr(x[S],2),O=k[0],C=k[1];w.push("".concat(O,": ").concat(C))}p=' style="'.concat(w.concat(o.header.styles[n]).join("; "),'"')}if(c=hr.calculateObjectValue(y,o.header.formatters[n],[l,t,e,i],l),t["_".concat(i,"_data")]&&!hr.isEmptyObject(t["_".concat(i,"_data")]))for(var T=0,P=Object.entries(t["_".concat(i,"_data")]);T<P.length;T++){var $=tr(P[T],2),I=$[0],A=$[1];if("index"===I)return;g+=" data-".concat(I,'="').concat(A,'"')}if(y.checkbox||y.radio){h=y.checkbox?"checkbox":h,h=y.radio?"radio":h;var E=y.class||"",R=(!0===c||l||c&&c.checked)&&!1!==c,j=!y.checkboxEnabled||c&&c.disabled;a=[o.options.cardView?'<div class="card-view '.concat(E,'">'):'<td class="bs-checkbox '.concat(E,'"').concat(f).concat(p,">"),'<label>\n            <input\n            data-index="'.concat(e,'"\n            name="').concat(o.options.selectItemName,'"\n            type="').concat(h,'"\n            ').concat(hr.sprintf('value="%s"',t[o.options.idField]),"\n            ").concat(hr.sprintf('checked="%s"',R?"checked":void 0),"\n            ").concat(hr.sprintf('disabled="%s"',j?"disabled":void 0)," />\n            <span></span>\n            </label>"),o.header.formatters[n]&&"string"==typeof c?c:"",o.options.cardView?"</div>":"</td>"].join(""),t[o.header.stateField]=!0===c||!!l||c&&c.checked}else if(c=null==c?o.options.undefinedText:c,o.options.cardView){var N=o.options.showHeader?'<span class="card-view-title"'.concat(p,">").concat(hr.getFieldTitle(o.columns,i),"</span>"):"";a='<div class="card-view">'.concat(N,'<span class="card-view-value">').concat(c,"</span></div>"),o.options.smartDisplay&&""===c&&(a='<div class="card-view"></div>')}else a="<td".concat(d).concat(f).concat(p).concat(g).concat(v).concat(b).concat(m,">").concat(c,"</td>");r.push(a)}})),this.options.cardView&&r.push("</div></td>"),r.push("</tr>"),r.join("")}}},{key:"initBody",value:function(e){var i=this,n=this.getData();this.trigger("pre-body",n),this.$body=this.$el.find(">tbody"),this.$body.length||(this.$body=t("<tbody></tbody>").appendTo(this.$el)),this.options.pagination&&"server"!==this.options.sidePagination||(this.pageFrom=1,this.pageTo=n.length);for(var o=[],r=t(document.createDocumentFragment()),a=!1,s=this.pageFrom-1;s<this.pageTo;s++){var l=n[s],c=this.initRow(l,s,n,r);a=a||!!c,c&&"string"==typeof c&&(this.options.virtualScroll?o.push(c):r.append(c))}a?this.options.virtualScroll?(this.virtualScroll&&this.virtualScroll.destroy(),this.virtualScroll=new ur({rows:o,fixedScroll:e,scrollEl:this.$tableBody[0],contentEl:this.$body[0],itemHeight:this.options.virtualScrollItemHeight,callback:function(){i.fitHeader(),i.initBodyEvent()}})):this.$body.html(r):this.$body.html('<tr class="no-records-found">'.concat(hr.sprintf('<td colspan="%s">%s</td>',this.$header.find("th").length,this.options.formatNoMatches()),"</tr>")),e||this.scrollTo(0),this.initBodyEvent(),this.updateSelected(),this.initFooter(),this.resetView(),"server"!==this.options.sidePagination&&(this.options.totalRows=n.length),this.trigger("post-body",n)}},{key:"initBodyEvent",value:function(){var e=this;this.$body.find("> tr[data-index] > td").off("click dblclick").on("click dblclick",(function(i){var n=t(i.currentTarget),o=n.parent(),r=t(i.target).parents(".card-views").children(),a=t(i.target).parents(".card-view"),s=o.data("index"),l=e.data[s],c=e.options.cardView?r.index(a):n[0].cellIndex,h=e.getVisibleFields()[e.options.detailView&&e.options.detailViewIcon&&!e.options.cardView?c-1:c],u=e.columns[e.fieldsColumnsIndex[h]],d=hr.getItemField(l,h,e.options.escape);if(!n.find(".detail-icon").length){if(e.trigger("click"===i.type?"click-cell":"dbl-click-cell",h,d,l,n),e.trigger("click"===i.type?"click-row":"dbl-click-row",l,o,h),"click"===i.type&&e.options.clickToSelect&&u.clickToSelect&&!hr.calculateObjectValue(e.options,e.options.ignoreClickToSelectOn,[i.target])){var f=o.find(hr.sprintf('[name="%s"]',e.options.selectItemName));f.length&&f[0].click()}"click"===i.type&&e.options.detailViewByClick&&e.toggleDetailView(s,e.header.detailFormatters[e.fieldsColumnsIndex[h]])}})).off("mousedown").on("mousedown",(function(t){e.multipleSelectRowCtrlKey=t.ctrlKey||t.metaKey,e.multipleSelectRowShiftKey=t.shiftKey})),this.$body.find("> tr[data-index] > td > .detail-icon").off("click").on("click",(function(i){return i.preventDefault(),e.toggleDetailView(t(i.currentTarget).parent().parent().data("index")),!1})),this.$selectItem=this.$body.find(hr.sprintf('[name="%s"]',this.options.selectItemName)),this.$selectItem.off("click").on("click",(function(i){i.stopImmediatePropagation();var n=t(i.currentTarget);e._toggleCheck(n.prop("checked"),n.data("index"))})),this.header.events.forEach((function(i,n){var o=i;if(o){"string"==typeof o&&(o=hr.calculateObjectValue(null,o));var r=e.header.fields[n],a=e.getVisibleFields().indexOf(r);if(-1!==a){e.options.detailView&&!e.options.cardView&&(a+=1);var s=function(i){if(!o.hasOwnProperty(i))return"continue";var n=o[i];e.$body.find(">tr:not(.no-records-found)").each((function(o,s){var l=t(s),c=l.find(e.options.cardView?".card-views>.card-view":">td").eq(a),h=i.indexOf(" "),u=i.substring(0,h),d=i.substring(h+1);c.find(d).off(u).on(u,(function(t){var i=l.data("index"),o=e.data[i],a=o[r];n.apply(e,[t,a,o,i])}))}))};for(var l in o)s(l)}}}))}},{key:"initServer",value:function(e,i,n){var o=this,r={},a=this.header.fields.indexOf(this.options.sortName),s={searchText:this.searchText,sortName:this.options.sortName,sortOrder:this.options.sortOrder};if(this.header.sortNames[a]&&(s.sortName=this.header.sortNames[a]),this.options.pagination&&"server"===this.options.sidePagination&&(s.pageSize=this.options.pageSize===this.options.formatAllRows()?this.options.totalRows:this.options.pageSize,s.pageNumber=this.options.pageNumber),(n||this.options.url||this.options.ajax)&&("limit"===this.options.queryParamsType&&(s={search:s.searchText,sort:s.sortName,order:s.sortOrder},this.options.pagination&&"server"===this.options.sidePagination&&(s.offset=this.options.pageSize===this.options.formatAllRows()?0:this.options.pageSize*(this.options.pageNumber-1),s.limit=this.options.pageSize===this.options.formatAllRows()?this.options.totalRows:this.options.pageSize,0===s.limit&&delete s.limit)),hr.isEmptyObject(this.filterColumnsPartial)||(s.filter=JSON.stringify(this.filterColumnsPartial,null)),t.extend(s,i||{}),!1!==(r=hr.calculateObjectValue(this.options,this.options.queryParams,[s],r)))){e||this.showLoading();var l=t.extend({},hr.calculateObjectValue(null,this.options.ajaxOptions),{type:this.options.method,url:n||this.options.url,data:"application/json"===this.options.contentType&&"post"===this.options.method?JSON.stringify(r):r,cache:this.options.cache,contentType:this.options.contentType,dataType:this.options.dataType,success:function(t,i,n){var r=hr.calculateObjectValue(o.options,o.options.responseHandler,[t,n],t);o.load(r),o.trigger("load-success",r,n&&n.status,n),e||o.hideLoading(),"server"===o.options.sidePagination&&r[o.options.totalField]>0&&!r[o.options.dataField].length&&o.updatePagination()},error:function(t){var i=[];"server"===o.options.sidePagination&&((i={})[o.options.totalField]=0,i[o.options.dataField]=[]),o.load(i),o.trigger("load-error",t&&t.status,t),e||o.$tableLoading.hide()}});return this.options.ajax?hr.calculateObjectValue(this,this.options.ajax,[l],null):(this._xhr&&4!==this._xhr.readyState&&this._xhr.abort(),this._xhr=t.ajax(l)),r}}},{key:"initSearchText",value:function(){if(this.options.search&&(this.searchText="",""!==this.options.searchText)){var t=this.$toolbar.find(".search input");t.val(this.options.searchText),this.onSearch({currentTarget:t,firedByInitSearchText:!0})}}},{key:"getCaret",value:function(){var e=this;this.$header.find("th").each((function(i,n){t(n).find(".sortable").removeClass("desc asc").addClass(t(n).data("field")===e.options.sortName?e.options.sortOrder:"both")}))}},{key:"updateSelected",value:function(){var e=this.$selectItem.filter(":enabled").length&&this.$selectItem.filter(":enabled").length===this.$selectItem.filter(":enabled").filter(":checked").length;this.$selectAll.add(this.$selectAll_).prop("checked",e),this.$selectItem.each((function(e,i){t(i).closest("tr")[t(i).prop("checked")?"addClass":"removeClass"]("selected")}))}},{key:"updateRows",value:function(){var e=this;this.$selectItem.each((function(i,n){e.data[t(n).data("index")][e.header.stateField]=t(n).prop("checked")}))}},{key:"resetRows",value:function(){var t=!0,e=!1,i=void 0;try{for(var n,o=this.data[Symbol.iterator]();!(t=(n=o.next()).done);t=!0){var r=n.value;this.$selectAll.prop("checked",!1),this.$selectItem.prop("checked",!1),this.header.stateField&&(r[this.header.stateField]=!1)}}catch(t){e=!0,i=t}finally{try{t||null==o.return||o.return()}finally{if(e)throw i}}this.initHiddenRows()}},{key:"trigger",value:function(i){for(var n,o="".concat(i,".bs.table"),r=arguments.length,a=new Array(r>1?r-1:0),s=1;s<r;s++)a[s-1]=arguments[s];(n=this.options)[e.EVENTS[o]].apply(n,a),this.$el.trigger(t.Event(o),a),this.options.onAll(o,a),this.$el.trigger(t.Event("all.bs.table"),[o,a])}},{key:"resetHeader",value:function(){var t=this;clearTimeout(this.timeoutId_),this.timeoutId_=setTimeout((function(){return t.fitHeader()}),this.$el.is(":hidden")?100:0)}},{key:"fitHeader",value:function(){var e=this;if(this.$el.is(":hidden"))this.timeoutId_=setTimeout((function(){return e.fitHeader()}),100);else{var i=this.$tableBody.get(0),n=i.scrollWidth>i.clientWidth&&i.scrollHeight>i.clientHeight+this.$header.outerHeight()?hr.getScrollBarWidth():0;this.$el.css("margin-top",-this.$header.outerHeight());var o=t(":focus");if(o.length>0){var r=o.parents("th");if(r.length>0){var a=r.attr("data-field");if(void 0!==a){var s=this.$header.find("[data-field='".concat(a,"']"));s.length>0&&s.find(":input").addClass("focus-temp")}}}this.$header_=this.$header.clone(!0,!0),this.$selectAll_=this.$header_.find('[name="btSelectAll"]'),this.$tableHeader.css("margin-right",n).find("table").css("width",this.$el.outerWidth()).html("").attr("class",this.$el.attr("class")).append(this.$header_),this.$tableLoading.css("width",this.$el.outerWidth());var l=t(".focus-temp:visible:eq(0)");l.length>0&&(l.focus(),this.$header.find(".focus-temp").removeClass("focus-temp")),this.$header.find("th[data-field]").each((function(i,n){e.$header_.find(hr.sprintf('th[data-field="%s"]',t(n).data("field"))).data(t(n).data())}));for(var c=this.getVisibleFields(),h=this.$header_.find("th"),u=this.$body.find(">tr:not(.no-records-found,.virtual-scroll-top)").eq(0);u.length&&u.find('>td[colspan]:not([colspan="1"])').length;)u=u.next();u.find("> *").each((function(i,n){var o=t(n),r=i;if(e.options.detailView&&e.options.detailViewIcon&&!e.options.cardView){if(0===i){var a=h.filter(".detail"),s=a.innerWidth()-a.find(".fht-cell").width();a.find(".fht-cell").width(o.innerWidth()-s)}r=i-1}if(-1!==r){var l=e.$header_.find(hr.sprintf('th[data-field="%s"]',c[r]));l.length>1&&(l=t(h[o[0].cellIndex]));var u=l.innerWidth()-l.find(".fht-cell").width();l.find(".fht-cell").width(o.innerWidth()-u)}})),this.horizontalScroll(),this.trigger("post-header")}}},{key:"initFooter",value:function(){if(this.options.showFooter&&!this.options.cardView){var t=this.getData(),e=[];!this.options.cardView&&this.options.detailView&&this.options.detailViewIcon&&e.push('<th class="detail"><div class="th-inner"></div><div class="fht-cell"></div></th>');var i=!0,n=!1,o=void 0;try{for(var r,a=this.columns[Symbol.iterator]();!(i=(r=a.next()).done);i=!0){var s,l,c=r.value,h=[],u={},d=hr.sprintf(' class="%s"',c.class);if(c.visible){if(this.options.cardView&&!c.cardVisible)return;if(s=hr.sprintf("text-align: %s; ",c.falign?c.falign:c.align),l=hr.sprintf("vertical-align: %s; ",c.valign),(u=hr.calculateObjectValue(null,this.options.footerStyle,[c]))&&u.css)for(var f=0,p=Object.entries(u.css);f<p.length;f++){var g=tr(p[f],2),v=g[0],b=g[1];h.push("".concat(v,": ").concat(b))}u&&u.classes&&(d=hr.sprintf(' class="%s"',c.class?[c.class,u.classes].join(" "):u.classes)),e.push("<th",d,hr.sprintf(' style="%s"',s+l+h.concat().join("; ")),">"),e.push('<div class="th-inner">'),e.push(hr.calculateObjectValue(c,c.footerFormatter,[t],this.footerData[0]&&this.footerData[0][c.field]||"")),e.push("</div>"),e.push('<div class="fht-cell"></div>'),e.push("</div>"),e.push("</th>")}}}catch(t){n=!0,o=t}finally{try{i||null==a.return||a.return()}finally{if(n)throw o}}this.options.height||this.$tableFooter.length||(this.$el.append("<tfoot><tr></tr></tfoot>"),this.$tableFooter=this.$el.find("tfoot")),this.$tableFooter.find("tr").html(e.join("")),this.trigger("post-footer",this.$tableFooter)}}},{key:"fitFooter",value:function(){var e=this;if(this.$el.is(":hidden"))setTimeout((function(){return e.fitFooter()}),100);else{var i=this.$tableBody.get(0),n=i.scrollWidth>i.clientWidth&&i.scrollHeight>i.clientHeight+this.$header.outerHeight()?hr.getScrollBarWidth():0;this.$tableFooter.css("margin-right",n).find("table").css("width",this.$el.outerWidth()).attr("class",this.$el.attr("class"));this.getVisibleFields();for(var o=this.$tableFooter.find("th"),r=this.$body.find(">tr:first-child:not(.no-records-found)");r.length&&r.find('>td[colspan]:not([colspan="1"])').length;)r=r.next();r.find("> *").each((function(i,n){var r=t(n),a=i;if(e.options.detailView&&!e.options.cardView){if(0===i){var s=o.filter(".detail"),l=s.innerWidth()-s.find(".fht-cell").width();s.find(".fht-cell").width(r.innerWidth()-l)}a=i-1}if(-1!==a){var c=o.eq(i),h=c.innerWidth()-c.find(".fht-cell").width();c.find(".fht-cell").width(r.innerWidth()-h)}})),this.horizontalScroll()}}},{key:"horizontalScroll",value:function(){var t=this;this.$tableBody.off("scroll").on("scroll",(function(){var e=t.$tableBody.scrollLeft();t.options.showHeader&&t.options.height&&t.$tableHeader.scrollLeft(e),t.options.showFooter&&!t.options.cardView&&t.$tableFooter.scrollLeft(e),t.trigger("scroll-body",t.$tableBody)}))}},{key:"getVisibleFields",value:function(){var t=[],e=!0,i=!1,n=void 0;try{for(var o,r=this.header.fields[Symbol.iterator]();!(e=(o=r.next()).done);e=!0){var a=o.value,s=this.columns[this.fieldsColumnsIndex[a]];s&&s.visible&&t.push(a)}}catch(t){i=!0,n=t}finally{try{e||null==r.return||r.return()}finally{if(i)throw n}}return t}},{key:"initHiddenRows",value:function(){this.hiddenRows=[]}},{key:"getOptions",value:function(){var e=t.extend({},this.options);return delete e.data,t.extend(!0,{},e)}},{key:"refreshOptions",value:function(e){hr.compareObjects(this.options,e,!0)||(this.options=t.extend(this.options,e),this.trigger("refresh-options",this.options),this.destroy(),this.init())}},{key:"getData",value:function(t){var e=this.options.data;if(!(this.searchText||this.options.customSearch||this.options.sortName)&&hr.isEmptyObject(this.filterColumns)&&hr.isEmptyObject(this.filterColumnsPartial)||t&&t.unfiltered||(e=this.data),t&&t.useCurrentPage&&(e=e.slice(this.pageFrom-1,this.pageTo)),t&&!t.includeHiddenRows){var i=this.getHiddenRows();e=e.filter((function(t){return-1===hr.findIndex(i,t)}))}return e}},{key:"getSelections",value:function(){var t=this;return this.data.filter((function(e){return!0===e[t.header.stateField]}))}},{key:"getAllSelections",value:function(){var t=this;return this.options.data.filter((function(e){return!0===e[t.header.stateField]}))}},{key:"load",value:function(t){var e,i=t;this.options.pagination&&"server"===this.options.sidePagination&&(this.options.totalRows=i[this.options.totalField]),this.options.pagination&&"server"===this.options.sidePagination&&(this.options.totalNotFiltered=i[this.options.totalNotFilteredField]),e=i.fixedScroll,i=Array.isArray(i)?i:i[this.options.dataField],this.initData(i),this.initSearch(),this.initPagination(),this.initBody(e)}},{key:"append",value:function(t){this.initData(t,"append"),this.initSearch(),this.initPagination(),this.initSort(),this.initBody(!0)}},{key:"prepend",value:function(t){this.initData(t,"prepend"),this.initSearch(),this.initPagination(),this.initSort(),this.initBody(!0)}},{key:"remove",value:function(t){var e,i,n=this.options.data.length;if(t.hasOwnProperty("field")&&t.hasOwnProperty("values")){for(e=n-1;e>=0;e--)(i=this.options.data[e]).hasOwnProperty(t.field)&&t.values.includes(i[t.field])&&(this.options.data.splice(e,1),"server"===this.options.sidePagination&&(this.options.totalRows-=1));n!==this.options.data.length&&(this.initSearch(),this.initPagination(),this.initSort(),this.initBody(!0))}}},{key:"removeAll",value:function(){this.options.data.length>0&&(this.options.data.splice(0,this.options.data.length),this.initSearch(),this.initPagination(),this.initBody(!0))}},{key:"insertRow",value:function(t){t.hasOwnProperty("index")&&t.hasOwnProperty("row")&&(this.options.data.splice(t.index,0,t.row),this.initSearch(),this.initPagination(),this.initSort(),this.initBody(!0))}},{key:"updateRow",value:function(e){var i=Array.isArray(e)?e:[e],n=!0,o=!1,r=void 0;try{for(var a,s=i[Symbol.iterator]();!(n=(a=s.next()).done);n=!0){var l=a.value;l.hasOwnProperty("index")&&l.hasOwnProperty("row")&&(t.extend(this.options.data[l.index],l.row),l.hasOwnProperty("replace")&&l.replace?this.options.data[l.index]=l.row:t.extend(this.options.data[l.index],l.row))}}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}this.initSearch(),this.initPagination(),this.initSort(),this.initBody(!0)}},{key:"getRowByUniqueId",value:function(t){var e,i,n,o=this.options.uniqueId,r=t,a=null;for(e=this.options.data.length-1;e>=0;e--){if((i=this.options.data[e]).hasOwnProperty(o))n=i[o];else{if(!i._data||!i._data.hasOwnProperty(o))continue;n=i._data[o]}if("string"==typeof n?r=r.toString():"number"==typeof n&&(Number(n)===n&&n%1==0?r=parseInt(r):n===Number(n)&&0!==n&&(r=parseFloat(r))),n===r){a=i;break}}return a}},{key:"updateByUniqueId",value:function(e){var i=Array.isArray(e)?e:[e],n=!0,o=!1,r=void 0;try{for(var a,s=i[Symbol.iterator]();!(n=(a=s.next()).done);n=!0){var l=a.value;if(l.hasOwnProperty("id")&&l.hasOwnProperty("row")){var c=this.options.data.indexOf(this.getRowByUniqueId(l.id));-1!==c&&(l.hasOwnProperty("replace")&&l.replace?this.options.data[c]=l.row:t.extend(this.options.data[c],l.row))}}}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}this.initSearch(),this.initPagination(),this.initSort(),this.initBody(!0)}},{key:"removeByUniqueId",value:function(t){var e=this.options.data.length,i=this.getRowByUniqueId(t);i&&this.options.data.splice(this.options.data.indexOf(i),1),e!==this.options.data.length&&(this.initSearch(),this.initPagination(),this.initBody(!0))}},{key:"updateCell",value:function(t){t.hasOwnProperty("index")&&t.hasOwnProperty("field")&&t.hasOwnProperty("value")&&(this.data[t.index][t.field]=t.value,!1!==t.reinit&&(this.initSort(),this.initBody(!0)))}},{key:"updateCellByUniqueId",value:function(t){var e=this;t.hasOwnProperty("id")&&t.hasOwnProperty("field")&&t.hasOwnProperty("value")&&((Array.isArray(t)?t:[t]).forEach((function(t){var i=t.id,n=t.field,o=t.value,r=e.options.data.indexOf(e.getRowByUniqueId(i));-1!==r&&(e.options.data[r][n]=o)})),!1!==t.reinit&&(this.initSort(),this.initBody(!0)))}},{key:"showRow",value:function(t){this._toggleRow(t,!0)}},{key:"hideRow",value:function(t){this._toggleRow(t,!1)}},{key:"_toggleRow",value:function(t,e){var i;if(t.hasOwnProperty("index")?i=this.getData()[t.index]:t.hasOwnProperty("uniqueId")&&(i=this.getRowByUniqueId(t.uniqueId)),i){var n=hr.findIndex(this.hiddenRows,i);e||-1!==n?e&&n>-1&&this.hiddenRows.splice(n,1):this.hiddenRows.push(i),e?this.updatePagination():(this.initBody(!0),this.initPagination())}}},{key:"getHiddenRows",value:function(t){if(t)return this.initHiddenRows(),void this.initBody(!0);var e=this.getData(),i=[],n=!0,o=!1,r=void 0;try{for(var a,s=e[Symbol.iterator]();!(n=(a=s.next()).done);n=!0){var l=a.value;this.hiddenRows.includes(l)&&i.push(l)}}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}return this.hiddenRows=i,i}},{key:"showColumn",value:function(t){var e=this;(Array.isArray(t)?t:[t]).forEach((function(t){e._toggleColumn(e.fieldsColumnsIndex[t],!0,!0)}))}},{key:"hideColumn",value:function(t){var e=this;(Array.isArray(t)?t:[t]).forEach((function(t){e._toggleColumn(e.fieldsColumnsIndex[t],!1,!0)}))}},{key:"_toggleColumn",value:function(t,e,i){if(-1!==t&&this.columns[t].visible!==e&&(this.columns[t].visible=e,this.initHeader(),this.initSearch(),this.initPagination(),this.initBody(),this.options.showColumns)){var n=this.$toolbar.find('.keep-open input:not(".toggle-all")').prop("disabled",!1);i&&n.filter(hr.sprintf('[value="%s"]',t)).prop("checked",e),n.filter(":checked").length<=this.options.minimumCountColumns&&n.filter(":checked").prop("disabled",!0)}}},{key:"getVisibleColumns",value:function(){var t=this;return this.columns.filter((function(e){return e.visible&&!t.isSelectionColumn(e)}))}},{key:"getHiddenColumns",value:function(){return this.columns.filter((function(t){return!t.visible}))}},{key:"isSelectionColumn",value:function(t){return t.radio||t.checkbox}},{key:"showAllColumns",value:function(){this._toggleAllColumns(!0)}},{key:"hideAllColumns",value:function(){this._toggleAllColumns(!1)}},{key:"_toggleAllColumns",value:function(e){var i=this,n=!0,o=!1,r=void 0;try{for(var a,s=this.columns.slice().reverse()[Symbol.iterator]();!(n=(a=s.next()).done);n=!0){var l=a.value;if(l.switchable){if(!e&&this.options.showColumns&&this.getVisibleColumns().length===this.options.minimumCountColumns)continue;l.visible=e}}}catch(t){o=!0,r=t}finally{try{n||null==s.return||s.return()}finally{if(o)throw r}}if(this.initHeader(),this.initSearch(),this.initPagination(),this.initBody(),this.options.showColumns){var c=this.$toolbar.find('.keep-open input[type="checkbox"]:not(".toggle-all")').prop("disabled",!1);e?c.prop("checked",e):c.get().reverse().forEach((function(n){c.filter(":checked").length>i.options.minimumCountColumns&&t(n).prop("checked",e)})),c.filter(":checked").length<=this.options.minimumCountColumns&&c.filter(":checked").prop("disabled",!0)}}},{key:"mergeCells",value:function(t){var e,i,n=t.index,o=this.getVisibleFields().indexOf(t.field),r=t.rowspan||1,a=t.colspan||1,s=this.$body.find(">tr");this.options.detailView&&!this.options.cardView&&(o+=1);var l=s.eq(n).find(">td").eq(o);if(!(n<0||o<0||n>=this.data.length)){for(e=n;e<n+r;e++)for(i=o;i<o+a;i++)s.eq(e).find(">td").eq(i).hide();l.attr("rowspan",r).attr("colspan",a).show()}}},{key:"checkAll",value:function(){this._toggleCheckAll(!0)}},{key:"uncheckAll",value:function(){this._toggleCheckAll(!1)}},{key:"_toggleCheckAll",value:function(t){var e=this.getSelections();this.$selectAll.add(this.$selectAll_).prop("checked",t),this.$selectItem.filter(":enabled").prop("checked",t),this.updateRows();var i=this.getSelections();t?this.trigger("check-all",i,e):this.trigger("uncheck-all",i,e)}},{key:"checkInvert",value:function(){var e=this.$selectItem.filter(":enabled"),i=e.filter(":checked");e.each((function(e,i){t(i).prop("checked",!t(i).prop("checked"))})),this.updateRows(),this.updateSelected(),this.trigger("uncheck-some",i),i=this.getSelections(),this.trigger("check-some",i)}},{key:"check",value:function(t){this._toggleCheck(!0,t)}},{key:"uncheck",value:function(t){this._toggleCheck(!1,t)}},{key:"_toggleCheck",value:function(t,e){var i=this.$selectItem.filter('[data-index="'.concat(e,'"]')),n=this.data[e];if(i.is(":radio")||this.options.singleSelect||this.options.multipleSelectRow&&!this.multipleSelectRowCtrlKey&&!this.multipleSelectRowShiftKey){var o=!0,r=!1,a=void 0;try{for(var s,l=this.options.data[Symbol.iterator]();!(o=(s=l.next()).done);o=!0){s.value[this.header.stateField]=!1}}catch(t){r=!0,a=t}finally{try{o||null==l.return||l.return()}finally{if(r)throw a}}this.$selectItem.filter(":checked").not(i).prop("checked",!1)}if(n[this.header.stateField]=t,this.options.multipleSelectRow){if(this.multipleSelectRowShiftKey&&this.multipleSelectRowLastSelectedIndex>=0)for(var c=[this.multipleSelectRowLastSelectedIndex,e].sort(),h=c[0]+1;h<c[1];h++)this.data[h][this.header.stateField]=!0,this.$selectItem.filter('[data-index="'.concat(h,'"]')).prop("checked",!0);this.multipleSelectRowCtrlKey=!1,this.multipleSelectRowShiftKey=!1,this.multipleSelectRowLastSelectedIndex=t?e:-1}i.prop("checked",t),this.updateSelected(),this.trigger(t?"check":"uncheck",this.data[e],i)}},{key:"checkBy",value:function(t){this._toggleCheckBy(!0,t)}},{key:"uncheckBy",value:function(t){this._toggleCheckBy(!1,t)}},{key:"_toggleCheckBy",value:function(t,e){var i=this;if(e.hasOwnProperty("field")&&e.hasOwnProperty("values")){var n=[];this.data.forEach((function(o,r){if(!o.hasOwnProperty(e.field))return!1;if(e.values.includes(o[e.field])){var a=i.$selectItem.filter(":enabled").filter(hr.sprintf('[data-index="%s"]',r));if(!(a=t?a.not(":checked"):a.filter(":checked")).length)return;a.prop("checked",t),o[i.header.stateField]=t,n.push(o),i.trigger(t?"check":"uncheck",o,a)}})),this.updateSelected(),this.trigger(t?"check-some":"uncheck-some",n)}}},{key:"refresh",value:function(t){t&&t.url&&(this.options.url=t.url),t&&t.pageNumber&&(this.options.pageNumber=t.pageNumber),t&&t.pageSize&&(this.options.pageSize=t.pageSize),this.trigger("refresh",this.initServer(t&&t.silent,t&&t.query,t&&t.url))}},{key:"destroy",value:function(){this.$el.insertBefore(this.$container),t(this.options.toolbar).insertBefore(this.$el),this.$container.next().remove(),this.$container.remove(),this.$el.html(this.$el_.html()).css("margin-top","0").attr("class",this.$el_.attr("class")||"")}},{key:"resetView",value:function(t){var e=0;if(t&&t.height&&(this.options.height=t.height),this.$selectAll.prop("checked",this.$selectItem.length>0&&this.$selectItem.length===this.$selectItem.filter(":checked").length),this.$tableContainer.toggleClass("has-card-view",this.options.cardView),!this.options.cardView&&this.options.showHeader&&this.options.height?(this.$tableHeader.show(),this.resetHeader(),e+=this.$header.outerHeight(!0)+1):(this.$tableHeader.hide(),this.trigger("post-header")),!this.options.cardView&&this.options.showFooter&&(this.$tableFooter.show(),this.fitFooter(),this.options.height&&(e+=this.$tableFooter.outerHeight(!0))),this.$container.hasClass("fullscreen"))this.$tableContainer.css("height",""),this.$tableContainer.css("width","");else if(this.options.height){var i=this.$toolbar.outerHeight(!0),n=this.$pagination.outerHeight(!0),o=this.options.height-i-n,r=this.$tableBody.find(">table"),a=r.outerHeight();if(this.$tableContainer.css("height","".concat(o,"px")),this.$tableBorder){var s=o-a-2;this.$tableBody[0].scrollWidth-this.$tableBody.innerWidth()&&(s-=hr.getScrollBarWidth()),this.$tableBorder.css("width","".concat(r.outerWidth(),"px")),this.$tableBorder.css("height","".concat(s,"px"))}}this.options.cardView?(this.$el.css("margin-top","0"),this.$tableContainer.css("padding-bottom","0"),this.$tableFooter.hide()):(this.getCaret(),this.$tableContainer.css("padding-bottom","".concat(e,"px"))),this.trigger("reset-view")}},{key:"showLoading",value:function(){this.$tableLoading.css("display","flex")}},{key:"hideLoading",value:function(){this.$tableLoading.css("display","none")}},{key:"togglePagination",value:function(){this.options.pagination=!this.options.pagination;var t=this.options.showButtonIcons?this.options.pagination?this.options.icons.paginationSwitchDown:this.options.icons.paginationSwitchUp:"",e=this.options.showButtonText?this.options.pagination?this.options.formatPaginationSwitchUp():this.options.formatPaginationSwitchDown():"";this.$toolbar.find('button[name="paginationSwitch"]').html(hr.sprintf(this.constants.html.icon,this.options.iconsPrefix,t)+" "+e),this.updatePagination()}},{key:"toggleFullscreen",value:function(){this.$el.closest(".bootstrap-table").toggleClass("fullscreen"),this.resetView()}},{key:"toggleView",value:function(){this.options.cardView=!this.options.cardView,this.initHeader();var t=this.options.showButtonIcons?this.options.cardView?this.options.icons.toggleOn:this.options.icons.toggleOff:"",e=this.options.showButtonText?this.options.cardView?this.options.formatToggleOff():this.options.formatToggleOn():"";this.$toolbar.find('button[name="toggle"]').html(hr.sprintf(this.constants.html.icon,this.options.iconsPrefix,t)+" "+e),this.initBody(),this.trigger("toggle",this.options.cardView)}},{key:"resetSearch",value:function(t){var e=this.$toolbar.find(".search input");e.val(t||""),this.onSearch({currentTarget:e})}},{key:"filterBy",value:function(e,i){this.filterOptions=hr.isEmptyObject(i)?this.options.filterOptions:t.extend(this.options.filterOptions,i),this.filterColumns=hr.isEmptyObject(e)?{}:e,this.options.pageNumber=1,this.initSearch(),this.updatePagination()}},{key:"scrollTo",value:function(e){if(void 0===e)return this.$tableBody.scrollTop();var i={unit:"px",value:0};"object"===Yo(e)?i=Object.assign(i,e):"string"==typeof e&&"bottom"===e?i.value=this.$tableBody[0].scrollHeight:"string"==typeof e&&(i.value=e);var n=i.value;"rows"===i.unit&&(n=0,this.$body.find("> tr:lt(".concat(i.value,")")).each((function(e,i){n+=t(i).outerHeight(!0)}))),this.$tableBody.scrollTop(n)}},{key:"getScrollPosition",value:function(){return this.scrollTo()}},{key:"selectPage",value:function(t){t>0&&t<=this.options.totalPages&&(this.options.pageNumber=t,this.updatePagination())}},{key:"prevPage",value:function(){this.options.pageNumber>1&&(this.options.pageNumber--,this.updatePagination())}},{key:"nextPage",value:function(){this.options.pageNumber<this.options.totalPages&&(this.options.pageNumber++,this.updatePagination())}},{key:"toggleDetailView",value:function(t,e){this.$body.find(hr.sprintf('> tr[data-index="%s"]',t)).next().is("tr.detail-view")?this.collapseRow(t):this.expandRow(t,e),this.resetView()}},{key:"expandRow",value:function(t,e){var i=this.data[t],n=this.$body.find(hr.sprintf('> tr[data-index="%s"][data-has-detail-view]',t));if(!n.next().is("tr.detail-view")){this.options.detailViewIcon&&n.find("a.detail-icon").html(hr.sprintf(this.constants.html.icon,this.options.iconsPrefix,this.options.icons.detailClose)),n.after(hr.sprintf('<tr class="detail-view"><td colspan="%s"></td></tr>',n.children("td").length));var o=n.next().find("td"),r=e||this.options.detailFormatter,a=hr.calculateObjectValue(this.options,r,[t,i,o],"");1===o.length&&o.append(a),this.trigger("expand-row",t,i,o)}}},{key:"collapseRow",value:function(t){var e=this.data[t],i=this.$body.find(hr.sprintf('> tr[data-index="%s"][data-has-detail-view]',t));i.next().is("tr.detail-view")&&(this.options.detailViewIcon&&i.find("a.detail-icon").html(hr.sprintf(this.constants.html.icon,this.options.iconsPrefix,this.options.icons.detailOpen)),this.trigger("collapse-row",t,e,i.next()),i.next().remove())}},{key:"expandAllRows",value:function(){for(var e=this.$body.find("> tr[data-index][data-has-detail-view]"),i=0;i<e.length;i++)this.expandRow(t(e[i]).data("index"))}},{key:"collapseAllRows",value:function(){for(var e=this.$body.find("> tr[data-index][data-has-detail-view]"),i=0;i<e.length;i++)this.collapseRow(t(e[i]).data("index"))}},{key:"updateColumnTitle",value:function(e){e.hasOwnProperty("field")&&e.hasOwnProperty("title")&&(this.columns[this.fieldsColumnsIndex[e.field]].title=this.options.escape?hr.escapeHTML(e.title):e.title,this.columns[this.fieldsColumnsIndex[e.field]].visible&&(void 0!==this.options.height?this.$tableHeader:this.$header).find("th[data-field]").each((function(i,n){if(t(n).data("field")===e.field)return t(t(n).find(".th-inner")[0]).text(e.title),!1})))}},{key:"updateFormatText",value:function(t,e){/^format/.test(t)&&this.options[t]&&("string"==typeof e?this.options[t]=function(){return e}:"function"==typeof e&&(this.options[t]=e),this.initToolbar(),this.initPagination(),this.initBody())}}]),e}();return dr.VERSION=lr.VERSION,dr.DEFAULTS=lr.DEFAULTS,dr.LOCALES=lr.LOCALES,dr.COLUMN_DEFAULTS=lr.COLUMN_DEFAULTS,dr.METHODS=lr.METHODS,dr.EVENTS=lr.EVENTS,t.BootstrapTable=dr,t.fn.bootstrapTable=function(e){for(var i=arguments.length,n=new Array(i>1?i-1:0),o=1;o<i;o++)n[o-1]=arguments[o];var r;return this.each((function(i,o){var a=t(o).data("bootstrap.table"),s=t.extend({},dr.DEFAULTS,t(o).data(),"object"===Yo(e)&&e);if("string"==typeof e){var l;if(!lr.METHODS.includes(e))throw new Error("Unknown method: ".concat(e));if(!a)return;r=(l=a)[e].apply(l,n),"destroy"===e&&t(o).removeData("bootstrap.table")}a||t(o).data("bootstrap.table",a=new t.BootstrapTable(o,s))})),void 0===r?this:r},t.fn.bootstrapTable.Constructor=dr,t.fn.bootstrapTable.theme=lr.THEME,t.fn.bootstrapTable.VERSION=lr.VERSION,t.fn.bootstrapTable.defaults=dr.DEFAULTS,t.fn.bootstrapTable.columnDefaults=dr.COLUMN_DEFAULTS,t.fn.bootstrapTable.events=dr.EVENTS,t.fn.bootstrapTable.locales=dr.LOCALES,t.fn.bootstrapTable.methods=dr.METHODS,t.fn.bootstrapTable.utils=hr,t((function(){t('[data-toggle="table"]').bootstrapTable()})),dr}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jquery":8}],7:[function(require,module,exports){
'use strict';

var ip = exports;
var Buffer = require('buffer').Buffer;
var os = require('os');

ip.toBuffer = function(ip, buff, offset) {
  offset = ~~offset;

  var result;

  if (this.isV4Format(ip)) {
    result = buff || new Buffer(offset + 4);
    ip.split(/\./g).map(function(byte) {
      result[offset++] = parseInt(byte, 10) & 0xff;
    });
  } else if (this.isV6Format(ip)) {
    var sections = ip.split(':', 8);

    var i;
    for (i = 0; i < sections.length; i++) {
      var isv4 = this.isV4Format(sections[i]);
      var v4Buffer;

      if (isv4) {
        v4Buffer = this.toBuffer(sections[i]);
        sections[i] = v4Buffer.slice(0, 2).toString('hex');
      }

      if (v4Buffer && ++i < 8) {
        sections.splice(i, 0, v4Buffer.slice(2, 4).toString('hex'));
      }
    }

    if (sections[0] === '') {
      while (sections.length < 8) sections.unshift('0');
    } else if (sections[sections.length - 1] === '') {
      while (sections.length < 8) sections.push('0');
    } else if (sections.length < 8) {
      for (i = 0; i < sections.length && sections[i] !== ''; i++);
      var argv = [ i, 1 ];
      for (i = 9 - sections.length; i > 0; i--) {
        argv.push('0');
      }
      sections.splice.apply(sections, argv);
    }

    result = buff || new Buffer(offset + 16);
    for (i = 0; i < sections.length; i++) {
      var word = parseInt(sections[i], 16);
      result[offset++] = (word >> 8) & 0xff;
      result[offset++] = word & 0xff;
    }
  }

  if (!result) {
    throw Error('Invalid ip address: ' + ip);
  }

  return result;
};

ip.toString = function(buff, offset, length) {
  offset = ~~offset;
  length = length || (buff.length - offset);

  var result = [];
  if (length === 4) {
    // IPv4
    for (var i = 0; i < length; i++) {
      result.push(buff[offset + i]);
    }
    result = result.join('.');
  } else if (length === 16) {
    // IPv6
    for (var i = 0; i < length; i += 2) {
      result.push(buff.readUInt16BE(offset + i).toString(16));
    }
    result = result.join(':');
    result = result.replace(/(^|:)0(:0)*:0(:|$)/, '$1::$3');
    result = result.replace(/:{3,4}/, '::');
  }

  return result;
};

var ipv4Regex = /^(\d{1,3}\.){3,3}\d{1,3}$/;
var ipv6Regex =
    /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i;

ip.isV4Format = function(ip) {
  return ipv4Regex.test(ip);
};

ip.isV6Format = function(ip) {
  return ipv6Regex.test(ip);
};
function _normalizeFamily(family) {
  return family ? family.toLowerCase() : 'ipv4';
}

ip.fromPrefixLen = function(prefixlen, family) {
  if (prefixlen > 32) {
    family = 'ipv6';
  } else {
    family = _normalizeFamily(family);
  }

  var len = 4;
  if (family === 'ipv6') {
    len = 16;
  }
  var buff = new Buffer(len);

  for (var i = 0, n = buff.length; i < n; ++i) {
    var bits = 8;
    if (prefixlen < 8) {
      bits = prefixlen;
    }
    prefixlen -= bits;

    buff[i] = ~(0xff >> bits) & 0xff;
  }

  return ip.toString(buff);
};

ip.mask = function(addr, mask) {
  addr = ip.toBuffer(addr);
  mask = ip.toBuffer(mask);

  var result = new Buffer(Math.max(addr.length, mask.length));

  var i = 0;
  // Same protocol - do bitwise and
  if (addr.length === mask.length) {
    for (i = 0; i < addr.length; i++) {
      result[i] = addr[i] & mask[i];
    }
  } else if (mask.length === 4) {
    // IPv6 address and IPv4 mask
    // (Mask low bits)
    for (i = 0; i < mask.length; i++) {
      result[i] = addr[addr.length - 4  + i] & mask[i];
    }
  } else {
    // IPv6 mask and IPv4 addr
    for (var i = 0; i < result.length - 6; i++) {
      result[i] = 0;
    }

    // ::ffff:ipv4
    result[10] = 0xff;
    result[11] = 0xff;
    for (i = 0; i < addr.length; i++) {
      result[i + 12] = addr[i] & mask[i + 12];
    }
    i = i + 12;
  }
  for (; i < result.length; i++)
    result[i] = 0;

  return ip.toString(result);
};

ip.cidr = function(cidrString) {
  var cidrParts = cidrString.split('/');

  var addr = cidrParts[0];
  if (cidrParts.length !== 2)
    throw new Error('invalid CIDR subnet: ' + addr);

  var mask = ip.fromPrefixLen(parseInt(cidrParts[1], 10));

  return ip.mask(addr, mask);
};

ip.subnet = function(addr, mask) {
  var networkAddress = ip.toLong(ip.mask(addr, mask));

  // Calculate the mask's length.
  var maskBuffer = ip.toBuffer(mask);
  var maskLength = 0;

  for (var i = 0; i < maskBuffer.length; i++) {
    if (maskBuffer[i] === 0xff) {
      maskLength += 8;
    } else {
      var octet = maskBuffer[i] & 0xff;
      while (octet) {
        octet = (octet << 1) & 0xff;
        maskLength++;
      }
    }
  }

  var numberOfAddresses = Math.pow(2, 32 - maskLength);

  return {
    networkAddress: ip.fromLong(networkAddress),
    firstAddress: numberOfAddresses <= 2 ?
                    ip.fromLong(networkAddress) :
                    ip.fromLong(networkAddress + 1),
    lastAddress: numberOfAddresses <= 2 ?
                    ip.fromLong(networkAddress + numberOfAddresses - 1) :
                    ip.fromLong(networkAddress + numberOfAddresses - 2),
    broadcastAddress: ip.fromLong(networkAddress + numberOfAddresses - 1),
    subnetMask: mask,
    subnetMaskLength: maskLength,
    numHosts: numberOfAddresses <= 2 ?
                numberOfAddresses : numberOfAddresses - 2,
    length: numberOfAddresses,
    contains: function(other) {
      return networkAddress === ip.toLong(ip.mask(other, mask));
    }
  };
};

ip.cidrSubnet = function(cidrString) {
  var cidrParts = cidrString.split('/');

  var addr = cidrParts[0];
  if (cidrParts.length !== 2)
    throw new Error('invalid CIDR subnet: ' + addr);

  var mask = ip.fromPrefixLen(parseInt(cidrParts[1], 10));

  return ip.subnet(addr, mask);
};

ip.not = function(addr) {
  var buff = ip.toBuffer(addr);
  for (var i = 0; i < buff.length; i++) {
    buff[i] = 0xff ^ buff[i];
  }
  return ip.toString(buff);
};

ip.or = function(a, b) {
  a = ip.toBuffer(a);
  b = ip.toBuffer(b);

  // same protocol
  if (a.length === b.length) {
    for (var i = 0; i < a.length; ++i) {
      a[i] |= b[i];
    }
    return ip.toString(a);

  // mixed protocols
  } else {
    var buff = a;
    var other = b;
    if (b.length > a.length) {
      buff = b;
      other = a;
    }

    var offset = buff.length - other.length;
    for (var i = offset; i < buff.length; ++i) {
      buff[i] |= other[i - offset];
    }

    return ip.toString(buff);
  }
};

ip.isEqual = function(a, b) {
  a = ip.toBuffer(a);
  b = ip.toBuffer(b);

  // Same protocol
  if (a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Swap
  if (b.length === 4) {
    var t = b;
    b = a;
    a = t;
  }

  // a - IPv4, b - IPv6
  for (var i = 0; i < 10; i++) {
    if (b[i] !== 0) return false;
  }

  var word = b.readUInt16BE(10);
  if (word !== 0 && word !== 0xffff) return false;

  for (var i = 0; i < 4; i++) {
    if (a[i] !== b[i + 12]) return false;
  }

  return true;
};

ip.isPrivate = function(addr) {
  return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i
      .test(addr) ||
    /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
    /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i
      .test(addr) ||
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
    /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
    /^f[cd][0-9a-f]{2}:/i.test(addr) ||
    /^fe80:/i.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr);
};

ip.isPublic = function(addr) {
  return !ip.isPrivate(addr);
};

ip.isLoopback = function(addr) {
  return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
      .test(addr) ||
    /^fe80::1$/.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr);
};

ip.loopback = function(family) {
  //
  // Default to `ipv4`
  //
  family = _normalizeFamily(family);

  if (family !== 'ipv4' && family !== 'ipv6') {
    throw new Error('family must be ipv4 or ipv6');
  }

  return family === 'ipv4' ? '127.0.0.1' : 'fe80::1';
};

//
// ### function address (name, family)
// #### @name {string|'public'|'private'} **Optional** Name or security
//      of the network interface.
// #### @family {ipv4|ipv6} **Optional** IP family of the address (defaults
//      to ipv4).
//
// Returns the address for the network interface on the current system with
// the specified `name`:
//   * String: First `family` address of the interface.
//             If not found see `undefined`.
//   * 'public': the first public ip address of family.
//   * 'private': the first private ip address of family.
//   * undefined: First address with `ipv4` or loopback address `127.0.0.1`.
//
ip.address = function(name, family) {
  var interfaces = os.networkInterfaces();
  var all;

  //
  // Default to `ipv4`
  //
  family = _normalizeFamily(family);

  //
  // If a specific network interface has been named,
  // return the address.
  //
  if (name && name !== 'private' && name !== 'public') {
    var res = interfaces[name].filter(function(details) {
      var itemFamily = details.family.toLowerCase();
      return itemFamily === family;
    });
    if (res.length === 0)
      return undefined;
    return res[0].address;
  }

  var all = Object.keys(interfaces).map(function (nic) {
    //
    // Note: name will only be `public` or `private`
    // when this is called.
    //
    var addresses = interfaces[nic].filter(function (details) {
      details.family = details.family.toLowerCase();
      if (details.family !== family || ip.isLoopback(details.address)) {
        return false;
      } else if (!name) {
        return true;
      }

      return name === 'public' ? ip.isPrivate(details.address) :
          ip.isPublic(details.address);
    });

    return addresses.length ? addresses[0].address : undefined;
  }).filter(Boolean);

  return !all.length ? ip.loopback(family) : all[0];
};

ip.toLong = function(ip) {
  var ipl = 0;
  ip.split('.').forEach(function(octet) {
    ipl <<= 8;
    ipl += parseInt(octet);
  });
  return(ipl >>> 0);
};

ip.fromLong = function(ipl) {
  return ((ipl >>> 24) + '.' +
      (ipl >> 16 & 255) + '.' +
      (ipl >> 8 & 255) + '.' +
      (ipl & 255) );
};

},{"buffer":2,"os":4}],8:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v3.4.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2019-05-01T21:04Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var document = window.document;

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};

var isFunction = function isFunction( obj ) {

      // Support: Chrome <=57, Firefox <=52
      // In some browsers, typeof returns "function" for HTML <object> elements
      // (i.e., `typeof document.createElement( "object" ) === "function"`).
      // We don't want to classify *any* DOM node as a function.
      return typeof obj === "function" && typeof obj.nodeType !== "number";
  };


var isWindow = function isWindow( obj ) {
		return obj != null && obj === obj.window;
	};




	var preservedScriptAttributes = {
		type: true,
		src: true,
		nonce: true,
		noModule: true
	};

	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
		if ( node ) {
			for ( i in preservedScriptAttributes ) {

				// Support: Firefox 64+, Edge 18+
				// Some browsers don't support the "nonce" property on scripts.
				// On the other hand, just using `getAttribute` is not enough as
				// the `nonce` attribute is reset to an empty string whenever it
				// becomes browsing-context connected.
				// See https://github.com/whatwg/html/issues/2369
				// See https://html.spec.whatwg.org/#nonce-attributes
				// The `node.getAttribute` check was added for the sake of
				// `jQuery.globalEval` so that it can fake a nonce-containing node
				// via an object.
				val = node[ i ] || node.getAttribute && node.getAttribute( i );
				if ( val ) {
					script.setAttribute( i, val );
				}
			}
		}
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	// Support: Android <=2.3 only (functionish RegExp)
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.4.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				copy = options[ name ];

				// Prevent Object.prototype pollution
				// Prevent never-ending loop
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {
					src = target[ name ];

					// Ensure proper type for the source value
					if ( copyIsArray && !Array.isArray( src ) ) {
						clone = [];
					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
						clone = {};
					} else {
						clone = src;
					}
					copyIsArray = false;

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	// Evaluates a script in a global context
	globalEval: function( code, options ) {
		DOMEval( code, { nonce: options && options.nonce } );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android <=4.0 only
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = toType( obj );

	if ( isFunction( obj ) || isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.4
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2019-04-08
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) &&

				// Support: IE 8 only
				// Exclude object elements
				(nodeType !== 1 || context.nodeName.toLowerCase() !== "object") ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 && rdescend.test( selector ) ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
						inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem.namespaceURI,
		docElem = (elem.ownerDocument || elem).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID filter and find
	if ( support.getById ) {
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode("id");
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( (elem = elems[i++]) ) {
						node = elem.getAttributeNode("id");
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

  return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

};
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Filtered directly for both simple and complex selectors
	return jQuery.filter( qualifier, elements, not );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		if ( typeof elem.contentDocument !== "undefined" ) {
			return elem.contentDocument;
		}

		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
		// Treat the template element as a regular one in browsers that
		// don't support it.
		if ( nodeName( elem, "template" ) ) {
			elem = elem.content || elem;
		}

		return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// rejected_handlers.disable
					// fulfilled_handlers.disable
					tuples[ 3 - i ][ 3 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock,

					// progress_handlers.lock
					tuples[ 0 ][ 3 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the master Deferred
			master = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( master.state() === "pending" ||
				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return master.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( toType( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};


// Matches dashed string for camelizing
var rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g;

// Used by camelCase as callback to replace()
function fcamelCase( all, letter ) {
	return letter.toUpperCase();
}

// Convert dashed to camelCase; used by the css and data modules
// Support: IE <=9 - 11, Edge 12 - 15
// Microsoft forgot to hump their vendor prefix (#9572)
function camelCase( string ) {
	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
}
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( camelCase );
			} else {
				key = camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var documentElement = document.documentElement;



	var isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem );
		},
		composed = { composed: true };

	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
	// Check attachment across shadow DOM boundaries when possible (gh-3504)
	// Support: iOS 10.0-10.2 only
	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
	// leading to errors. We need to check for `getRootNode`.
	if ( documentElement.getRootNode ) {
		isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem ) ||
				elem.getRootNode( composed ) === elem.ownerDocument;
		};
	}
var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			isAttached( elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted, scale,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = elem.nodeType &&
			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Support: Firefox <=54
		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
		initial = initial / 2;

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		while ( maxIterations-- ) {

			// Evaluate and update our best guess (doubling guesses that zero out).
			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
			jQuery.style( elem, prop, initialInUnit + unit );
			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
				maxIterations = 0;
			}
			initialInUnit = initialInUnit / scale;

		}

		initialInUnit = initialInUnit * 2;
		jQuery.style( elem, prop, initialInUnit + unit );

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE <=9 only
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE <=9 only
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, attached, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( toType( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		attached = isAttached( elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( attached ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 - 11+
// focus() and blur() are asynchronous, except when they are no-op.
// So expect focus to be synchronous when the element is already active,
// and blur to be synchronous when the element is not already active.
// (focus and blur are always synchronous in other supported browsers,
// this just defines when we can count on it).
function expectSync( elem, type ) {
	return ( elem === safeActiveElement() ) === ( type === "focus" );
}

// Support: IE <=9 only
// Accessing document.activeElement can throw unexpectedly
// https://bugs.jquery.com/ticket/13393
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		// Make a writable jQuery.Event from the native event object
		var event = jQuery.event.fix( nativeEvent );

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// If the event is namespaced, then each handler is only invoked if it is
				// specially universal or its namespaces are a superset of the event's.
				if ( !event.rnamespace || handleObj.namespace === false ||
					event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
							return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
							return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		click: {

			// Utilize native event to ensure correct state for checkable inputs
			setup: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Claim the first handler
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					// dataPriv.set( el, "click", ... )
					leverageNative( el, "click", returnTrue );
				}

				// Return false to allow normal processing in the caller
				return false;
			},
			trigger: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Force setup before triggering a click
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					leverageNative( el, "click" );
				}

				// Return non-false to allow normal event-path propagation
				return true;
			},

			// For cross-browser consistency, suppress native .click() on links
			// Also prevent it if we're currently inside a leveraged native-event stack
			_default: function( event ) {
				var target = event.target;
				return rcheckableType.test( target.type ) &&
					target.click && nodeName( target, "input" ) &&
					dataPriv.get( target, "click" ) ||
					nodeName( target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative( el, type, expectSync ) {

	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
	if ( !expectSync ) {
		if ( dataPriv.get( el, type ) === undefined ) {
			jQuery.event.add( el, type, returnTrue );
		}
		return;
	}

	// Register the controller as a special universal handler for all event namespaces
	dataPriv.set( el, type, false );
	jQuery.event.add( el, type, {
		namespace: false,
		handler: function( event ) {
			var notAsync, result,
				saved = dataPriv.get( this, type );

			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

				// Interrupt processing of the outer synthetic .trigger()ed event
				// Saved data should be false in such cases, but might be a leftover capture object
				// from an async native handler (gh-4350)
				if ( !saved.length ) {

					// Store arguments for use when handling the inner native event
					// There will always be at least one argument (an event object), so this array
					// will not be confused with a leftover capture object.
					saved = slice.call( arguments );
					dataPriv.set( this, type, saved );

					// Trigger the native event and capture its result
					// Support: IE <=9 - 11+
					// focus() and blur() are asynchronous
					notAsync = expectSync( this, type );
					this[ type ]();
					result = dataPriv.get( this, type );
					if ( saved !== result || notAsync ) {
						dataPriv.set( this, type, false );
					} else {
						result = {};
					}
					if ( saved !== result ) {

						// Cancel the outer synthetic event
						event.stopImmediatePropagation();
						event.preventDefault();
						return result.value;
					}

				// If this is an inner synthetic event for an event with a bubbling surrogate
				// (focus or blur), assume that the surrogate already propagated from triggering the
				// native event and prevent that from happening again here.
				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
				// less bad than duplication.
				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
					event.stopPropagation();
				}

			// If this is a native event triggered above, everything is now in order
			// Fire an inner synthetic event with the original arguments
			} else if ( saved.length ) {

				// ...and capture the result
				dataPriv.set( this, type, {
					value: jQuery.event.trigger(

						// Support: IE <=9 - 11+
						// Extend with the prototype to reset the above stopImmediatePropagation()
						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
						saved.slice( 1 ),
						this
					)
				} );

				// Abort handling of the native event
				event.stopImmediatePropagation();
			}
		}
	} );
}

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || Date.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	code: true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,

	which: function( event ) {
		var button = event.button;

		// Add which for key events
		if ( event.which == null && rkeyEvent.test( event.type ) ) {
			return event.charCode != null ? event.charCode : event.keyCode;
		}

		// Add which for click: 1 === left; 2 === middle; 3 === right
		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
			if ( button & 1 ) {
				return 1;
			}

			if ( button & 2 ) {
				return 3;
			}

			if ( button & 4 ) {
				return 2;
			}

			return 0;
		}

		return event.which;
	}
}, jQuery.event.addProp );

jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
	jQuery.event.special[ type ] = {

		// Utilize native event if possible so blur/focus sequence is correct
		setup: function() {

			// Claim the first handler
			// dataPriv.set( this, "focus", ... )
			// dataPriv.set( this, "blur", ... )
			leverageNative( this, type, expectSync );

			// Return false to allow normal processing in the caller
			return false;
		},
		trigger: function() {

			// Force setup before trigger
			leverageNative( this, type );

			// Return non-false to allow normal event-path propagation
			return true;
		},

		delegateType: delegateType
	};
} );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13 only
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
		elem.type = elem.type.slice( 5 );
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		valueIsFunction = isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( valueIsFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( valueIsFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {
									nonce: node.nonce || node.getAttribute( "nonce" )
								} );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && isAttached( node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = isAttached( elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
			"margin-top:1px;padding:0;border:0";
		div.style.cssText =
			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
			"margin:auto;border:1px;padding:1px;" +
			"width:60%;top:1%";
		documentElement.appendChild( container ).appendChild( div );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
		// Some styles come back with percentage values, even though they shouldn't
		div.style.right = "60%";
		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

		// Support: IE 9 - 11 only
		// Detect misreporting of content dimensions for box-sizing:border-box elements
		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

		// Support: IE 9 only
		// Detect overflow:scroll screwiness (gh-3699)
		// Support: Chrome <=64
		// Don't get tricked when zoom affects offsetWidth (gh-4029)
		div.style.position = "absolute";
		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	function roundPixelMeasures( measure ) {
		return Math.round( parseFloat( measure ) );
	}

	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
		reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	jQuery.extend( support, {
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelBoxStyles: function() {
			computeStyleTests();
			return pixelBoxStylesVal;
		},
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		},
		scrollboxSize: function() {
			computeStyleTests();
			return scrollboxSizeVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !isAttached( elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style,
	vendorProps = {};

// Return a vendor-prefixed property or undefined
function vendorPropName( name ) {

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a potentially-mapped jQuery.cssProps or vendor prefixed property
function finalPropName( name ) {
	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

	if ( final ) {
		return final;
	}
	if ( name in emptyStyle ) {
		return name;
	}
	return vendorProps[ name ] = vendorPropName( name ) || name;
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	};

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
	var i = dimension === "width" ? 1 : 0,
		extra = 0,
		delta = 0;

	// Adjustment may not be necessary
	if ( box === ( isBorderBox ? "border" : "content" ) ) {
		return 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin
		if ( box === "margin" ) {
			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
		}

		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
		if ( !isBorderBox ) {

			// Add padding
			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// For "border" or "margin", add border
			if ( box !== "padding" ) {
				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

			// But still keep track of it otherwise
			} else {
				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}

		// If we get here with a border-box (content + padding + border), we're seeking "content" or
		// "padding" or "margin"
		} else {

			// For "content", subtract padding
			if ( box === "content" ) {
				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// For "content" or "padding", subtract border
			if ( box !== "margin" ) {
				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	// Account for positive content-box scroll gutter when requested by providing computedVal
	if ( !isBorderBox && computedVal >= 0 ) {

		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
		// Assuming integer scroll gutter, subtract the rest and round down
		delta += Math.max( 0, Math.ceil(
			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
			computedVal -
			delta -
			extra -
			0.5

		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
		// Use an explicit zero to avoid NaN (gh-3964)
		) ) || 0;
	}

	return delta;
}

function getWidthOrHeight( elem, dimension, extra ) {

	// Start with computed style
	var styles = getStyles( elem ),

		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
		// Fake content-box until we know it's needed to know the true value.
		boxSizingNeeded = !support.boxSizingReliable() || extra,
		isBorderBox = boxSizingNeeded &&
			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
		valueIsBorderBox = isBorderBox,

		val = curCSS( elem, dimension, styles ),
		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

	// Support: Firefox <=54
	// Return a confounding non-pixel value or feign ignorance, as appropriate.
	if ( rnumnonpx.test( val ) ) {
		if ( !extra ) {
			return val;
		}
		val = "auto";
	}


	// Fall back to offsetWidth/offsetHeight when value is "auto"
	// This happens for inline elements with no explicit setting (gh-3571)
	// Support: Android <=4.1 - 4.3 only
	// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
	// Support: IE 9-11 only
	// Also use offsetWidth/offsetHeight for when box sizing is unreliable
	// We use getClientRects() to check for hidden/disconnected.
	// In those cases, the computed value can be trusted to be border-box
	if ( ( !support.boxSizingReliable() && isBorderBox ||
		val === "auto" ||
		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&
		elem.getClientRects().length ) {

		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
		// retrieved value as a content box dimension.
		valueIsBorderBox = offsetProp in elem;
		if ( valueIsBorderBox ) {
			val = elem[ offsetProp ];
		}
	}

	// Normalize "" and auto
	val = parseFloat( val ) || 0;

	// Adjust for the element's box model
	return ( val +
		boxModelAdjustment(
			elem,
			dimension,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles,

			// Provide the current computed size to request scroll gutter calculation (gh-3589)
			val
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"gridArea": true,
		"gridColumn": true,
		"gridColumnEnd": true,
		"gridColumnStart": true,
		"gridRow": true,
		"gridRowEnd": true,
		"gridRowStart": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
			// "px" to a few hardcoded values.
			if ( type === "number" && !isCustomProp ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, dimension ) {
	jQuery.cssHooks[ dimension ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, dimension, extra );
						} ) :
						getWidthOrHeight( elem, dimension, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = getStyles( elem ),

				// Only read styles.position if the test has a chance to fail
				// to avoid forcing a reflow.
				scrollboxSizeBuggy = !support.scrollboxSize() &&
					styles.position === "absolute",

				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
				boxSizingNeeded = scrollboxSizeBuggy || extra,
				isBorderBox = boxSizingNeeded &&
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
				subtract = extra ?
					boxModelAdjustment(
						elem,
						dimension,
						extra,
						isBorderBox,
						styles
					) :
					0;

			// Account for unreliable border-box dimensions by comparing offset* to computed and
			// faking a content-box to get border and padding (gh-3699)
			if ( isBorderBox && scrollboxSizeBuggy ) {
				subtract -= Math.ceil(
					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
					parseFloat( styles[ dimension ] ) -
					boxModelAdjustment( elem, dimension, "border", false, styles ) -
					0.5
				);
			}

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ dimension ] = value;
				value = jQuery.css( elem, dimension );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( prefix !== "margin" ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 && (
					jQuery.cssHooks[ tween.prop ] ||
					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = Date.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 15
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY and Edge just mirrors
		// the overflowX value there.
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

			/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					result.stop.bind( result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = Date.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

function classesToArray( value ) {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === "string" ) {
		return value.match( rnothtmlwhite ) || [];
	}
	return [];
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isValidValue = type === "string" || Array.isArray( value );

		if ( typeof stateVal === "boolean" && isValidValue ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( isValidValue ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = classesToArray( value );

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
					return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, valueIsFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		valueIsFunction = isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( valueIsFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


support.focusin = "onfocusin" in window;


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	stopPropagationCallback = function( e ) {
		e.stopPropagation();
	};

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = lastElement = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
			lastElement = cur;
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;

					if ( event.isPropagationStopped() ) {
						lastElement.addEventListener( type, stopPropagationCallback );
					}

					elem[ type ]();

					if ( event.isPropagationStopped() ) {
						lastElement.removeEventListener( type, stopPropagationCallback );
					}

					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = Date.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && toType( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
										.concat( match[ 2 ] );
							}
						}
						match = responseHeaders[ key.toLowerCase() + " " ];
					}
					return match == null ? null : match.join( ", " );
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 15
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available and should be processed, append data to url
			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url, options ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,

		// Only evaluate the response if it is successful (gh-4126)
		// dataFilter is not invoked for failure responses, so using it instead
		// of the default converter is kludgy but it works.
		converters: {
			"text script": function() {}
		},
		dataFilter: function( response ) {
			jQuery.globalEval( response, options );
		}
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var htmlIsFunction = isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.ontimeout =
									xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain or forced-by-attrs requests
	if ( s.crossDomain || s.scriptAttrs ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" )
					.attr( s.scriptAttrs || {} )
					.prop( { charset: s.scriptCharset, src: s.url } )
					.on( "load error", callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					} );

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {

	// offset() relates an element's border box to the document origin
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
		rect = elem.getBoundingClientRect();
		win = elem.ownerDocument.defaultView;
		return {
			top: rect.top + win.pageYOffset,
			left: rect.left + win.pageXOffset
		};
	},

	// position() relates an element's margin box to its offset parent's padding box
	// This corresponds to the behavior of CSS absolute positioning
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset, doc,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// position:fixed elements are offset from the viewport, which itself always has zero offset
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume position:fixed implies availability of getBoundingClientRect
			offset = elem.getBoundingClientRect();

		} else {
			offset = this.offset();

			// Account for the *real* offset parent, which can be the document or its root element
			// when a statically positioned element is identified
			doc = elem.ownerDocument;
			offsetParent = elem.offsetParent || doc.documentElement;
			while ( offsetParent &&
				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
				jQuery.css( offsetParent, "position" ) === "static" ) {

				offsetParent = offsetParent.parentNode;
			}
			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

				// Incorporate borders into its offset, since they are outside its content origin
				parentOffset = jQuery( offsetParent ).offset();
				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
			}
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

// Bind a function to a context, optionally partially applying any
// arguments.
// jQuery.proxy is deprecated to promote standards (specifically Function#bind)
// However, it is not slated for removal any time soon
jQuery.proxy = function( fn, context ) {
	var tmp, args, proxy;

	if ( typeof context === "string" ) {
		tmp = fn[ context ];
		context = fn;
		fn = tmp;
	}

	// Quick check to determine if target is callable, in the spec
	// this throws a TypeError, but we will just return undefined.
	if ( !isFunction( fn ) ) {
		return undefined;
	}

	// Simulated bind
	args = slice.call( arguments, 2 );
	proxy = function() {
		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
	};

	// Set the guid of unique handler to the same of original handler, so it can be removed
	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

	return proxy;
};

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;
jQuery.isFunction = isFunction;
jQuery.isWindow = isWindow;
jQuery.camelCase = camelCase;
jQuery.type = toType;

jQuery.now = Date.now;

jQuery.isNumeric = function( obj ) {

	// As of jQuery 3.0, isNumeric is limited to
	// strings and numbers (primitives or objects)
	// that can be coerced to finite numbers (gh-2662)
	var type = jQuery.type( obj );
	return ( type === "number" || type === "string" ) &&

		// parseFloat NaNs numeric-cast false positives ("")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		!isNaN( obj - parseFloat( obj ) );
};




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );

},{}],9:[function(require,module,exports){
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.mongoose=e():t.mongoose=e()}("undefined"!=typeof self?self:this,function(){return function(t){var e={};function r(n){if(e[n])return e[n].exports;var i=e[n]={i:n,l:!1,exports:{}};return t[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)r.d(n,i,function(e){return t[e]}.bind(null,i));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=93)}([function(t,e,r){"use strict";e.arrayAtomicsSymbol=Symbol("mongoose#Array#_atomics"),e.arrayParentSymbol=Symbol("mongoose#Array#_parent"),e.arrayPathSymbol=Symbol("mongoose#Array#_path"),e.arraySchemaSymbol=Symbol("mongoose#Array#_schema"),e.documentArrayParent=Symbol("mongoose:documentArrayParent"),e.documentSchemaSymbol=Symbol("mongoose#Document#schema"),e.getSymbol=Symbol("mongoose#Document#get"),e.modelSymbol=Symbol("mongoose#Model"),e.objectIdSymbol=Symbol("mongoose#ObjectId"),e.populateModelSymbol=Symbol("mongoose.PopulateOptions#Model"),e.schemaTypeSymbol=Symbol("mongoose#schemaType"),e.scopeSymbol=Symbol("mongoose#Document#scope"),e.validatorErrorSymbol=Symbol("mongoose:validatorError")},function(t,e,r){"use strict";(function(t){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <http://feross.org>
 * @license  MIT
 */
var n=r(95),i=r(96),o=r(97);function s(){return u.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function a(t,e){if(s()<e)throw new RangeError("Invalid typed array length");return u.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(e)).__proto__=u.prototype:(null===t&&(t=new u(e)),t.length=e),t}function u(t,e,r){if(!(u.TYPED_ARRAY_SUPPORT||this instanceof u))return new u(t,e,r);if("number"==typeof t){if("string"==typeof e)throw new Error("If encoding is specified then the first argument must be a string");return f(this,t)}return c(this,t,e,r)}function c(t,e,r,n){if("number"==typeof e)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&e instanceof ArrayBuffer?function(t,e,r,n){if(e.byteLength,r<0||e.byteLength<r)throw new RangeError("'offset' is out of bounds");if(e.byteLength<r+(n||0))throw new RangeError("'length' is out of bounds");e=void 0===r&&void 0===n?new Uint8Array(e):void 0===n?new Uint8Array(e,r):new Uint8Array(e,r,n);u.TYPED_ARRAY_SUPPORT?(t=e).__proto__=u.prototype:t=h(t,e);return t}(t,e,r,n):"string"==typeof e?function(t,e,r){"string"==typeof r&&""!==r||(r="utf8");if(!u.isEncoding(r))throw new TypeError('"encoding" must be a valid string encoding');var n=0|y(e,r),i=(t=a(t,n)).write(e,r);i!==n&&(t=t.slice(0,i));return t}(t,e,r):function(t,e){if(u.isBuffer(e)){var r=0|p(e.length);return 0===(t=a(t,r)).length?t:(e.copy(t,0,0,r),t)}if(e){if("undefined"!=typeof ArrayBuffer&&e.buffer instanceof ArrayBuffer||"length"in e)return"number"!=typeof e.length||function(t){return t!=t}(e.length)?a(t,0):h(t,e);if("Buffer"===e.type&&o(e.data))return h(t,e.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(t,e)}function l(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function f(t,e){if(l(e),t=a(t,e<0?0:0|p(e)),!u.TYPED_ARRAY_SUPPORT)for(var r=0;r<e;++r)t[r]=0;return t}function h(t,e){var r=e.length<0?0:0|p(e.length);t=a(t,r);for(var n=0;n<r;n+=1)t[n]=255&e[n];return t}function p(t){if(t>=s())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+s().toString(16)+" bytes");return 0|t}function y(t,e){if(u.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var r=t.length;if(0===r)return 0;for(var n=!1;;)switch(e){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":case void 0:return L(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return U(t).length;default:if(n)return L(t).length;e=(""+e).toLowerCase(),n=!0}}function d(t,e,r){var n=t[e];t[e]=t[r],t[r]=n}function v(t,e,r,n,i){if(0===t.length)return-1;if("string"==typeof r?(n=r,r=0):r>2147483647?r=2147483647:r<-2147483648&&(r=-2147483648),r=+r,isNaN(r)&&(r=i?0:t.length-1),r<0&&(r=t.length+r),r>=t.length){if(i)return-1;r=t.length-1}else if(r<0){if(!i)return-1;r=0}if("string"==typeof e&&(e=u.from(e,n)),u.isBuffer(e))return 0===e.length?-1:_(t,e,r,n,i);if("number"==typeof e)return e&=255,u.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,e,r):Uint8Array.prototype.lastIndexOf.call(t,e,r):_(t,[e],r,n,i);throw new TypeError("val must be string, number or Buffer")}function _(t,e,r,n,i){var o,s=1,a=t.length,u=e.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||e.length<2)return-1;s=2,a/=2,u/=2,r/=2}function c(t,e){return 1===s?t[e]:t.readUInt16BE(e*s)}if(i){var l=-1;for(o=r;o<a;o++)if(c(t,o)===c(e,-1===l?0:o-l)){if(-1===l&&(l=o),o-l+1===u)return l*s}else-1!==l&&(o-=o-l),l=-1}else for(r+u>a&&(r=a-u),o=r;o>=0;o--){for(var f=!0,h=0;h<u;h++)if(c(t,o+h)!==c(e,h)){f=!1;break}if(f)return o}return-1}function m(t,e,r,n){r=Number(r)||0;var i=t.length-r;n?(n=Number(n))>i&&(n=i):n=i;var o=e.length;if(o%2!=0)throw new TypeError("Invalid hex string");n>o/2&&(n=o/2);for(var s=0;s<n;++s){var a=parseInt(e.substr(2*s,2),16);if(isNaN(a))return s;t[r+s]=a}return s}function g(t,e,r,n){return V(L(e,t.length-r),t,r,n)}function b(t,e,r,n){return V(function(t){for(var e=[],r=0;r<t.length;++r)e.push(255&t.charCodeAt(r));return e}(e),t,r,n)}function w(t,e,r,n){return b(t,e,r,n)}function O(t,e,r,n){return V(U(e),t,r,n)}function S(t,e,r,n){return V(function(t,e){for(var r,n,i,o=[],s=0;s<t.length&&!((e-=2)<0);++s)r=t.charCodeAt(s),n=r>>8,i=r%256,o.push(i),o.push(n);return o}(e,t.length-r),t,r,n)}function E(t,e,r){return 0===e&&r===t.length?n.fromByteArray(t):n.fromByteArray(t.slice(e,r))}function A(t,e,r){r=Math.min(t.length,r);for(var n=[],i=e;i<r;){var o,s,a,u,c=t[i],l=null,f=c>239?4:c>223?3:c>191?2:1;if(i+f<=r)switch(f){case 1:c<128&&(l=c);break;case 2:128==(192&(o=t[i+1]))&&(u=(31&c)<<6|63&o)>127&&(l=u);break;case 3:o=t[i+1],s=t[i+2],128==(192&o)&&128==(192&s)&&(u=(15&c)<<12|(63&o)<<6|63&s)>2047&&(u<55296||u>57343)&&(l=u);break;case 4:o=t[i+1],s=t[i+2],a=t[i+3],128==(192&o)&&128==(192&s)&&128==(192&a)&&(u=(15&c)<<18|(63&o)<<12|(63&s)<<6|63&a)>65535&&u<1114112&&(l=u)}null===l?(l=65533,f=1):l>65535&&(l-=65536,n.push(l>>>10&1023|55296),l=56320|1023&l),n.push(l),i+=f}return function(t){var e=t.length;if(e<=j)return String.fromCharCode.apply(String,t);var r="",n=0;for(;n<e;)r+=String.fromCharCode.apply(String,t.slice(n,n+=j));return r}(n)}e.Buffer=u,e.SlowBuffer=function(t){+t!=t&&(t=0);return u.alloc(+t)},e.INSPECT_MAX_BYTES=50,u.TYPED_ARRAY_SUPPORT=void 0!==t.TYPED_ARRAY_SUPPORT?t.TYPED_ARRAY_SUPPORT:function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(t){return!1}}(),e.kMaxLength=s(),u.poolSize=8192,u._augment=function(t){return t.__proto__=u.prototype,t},u.from=function(t,e,r){return c(null,t,e,r)},u.TYPED_ARRAY_SUPPORT&&(u.prototype.__proto__=Uint8Array.prototype,u.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&u[Symbol.species]===u&&Object.defineProperty(u,Symbol.species,{value:null,configurable:!0})),u.alloc=function(t,e,r){return function(t,e,r,n){return l(e),e<=0?a(t,e):void 0!==r?"string"==typeof n?a(t,e).fill(r,n):a(t,e).fill(r):a(t,e)}(null,t,e,r)},u.allocUnsafe=function(t){return f(null,t)},u.allocUnsafeSlow=function(t){return f(null,t)},u.isBuffer=function(t){return!(null==t||!t._isBuffer)},u.compare=function(t,e){if(!u.isBuffer(t)||!u.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var r=t.length,n=e.length,i=0,o=Math.min(r,n);i<o;++i)if(t[i]!==e[i]){r=t[i],n=e[i];break}return r<n?-1:n<r?1:0},u.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},u.concat=function(t,e){if(!o(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return u.alloc(0);var r;if(void 0===e)for(e=0,r=0;r<t.length;++r)e+=t[r].length;var n=u.allocUnsafe(e),i=0;for(r=0;r<t.length;++r){var s=t[r];if(!u.isBuffer(s))throw new TypeError('"list" argument must be an Array of Buffers');s.copy(n,i),i+=s.length}return n},u.byteLength=y,u.prototype._isBuffer=!0,u.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)d(this,e,e+1);return this},u.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)d(this,e,e+3),d(this,e+1,e+2);return this},u.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)d(this,e,e+7),d(this,e+1,e+6),d(this,e+2,e+5),d(this,e+3,e+4);return this},u.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?A(this,0,t):function(t,e,r){var n=!1;if((void 0===e||e<0)&&(e=0),e>this.length)return"";if((void 0===r||r>this.length)&&(r=this.length),r<=0)return"";if((r>>>=0)<=(e>>>=0))return"";for(t||(t="utf8");;)switch(t){case"hex":return P(this,e,r);case"utf8":case"utf-8":return A(this,e,r);case"ascii":return $(this,e,r);case"latin1":case"binary":return x(this,e,r);case"base64":return E(this,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return N(this,e,r);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}.apply(this,arguments)},u.prototype.equals=function(t){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===u.compare(this,t)},u.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,r).match(/.{2}/g).join(" "),this.length>r&&(t+=" ... ")),"<Buffer "+t+">"},u.prototype.compare=function(t,e,r,n,i){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===e&&(e=0),void 0===r&&(r=t?t.length:0),void 0===n&&(n=0),void 0===i&&(i=this.length),e<0||r>t.length||n<0||i>this.length)throw new RangeError("out of range index");if(n>=i&&e>=r)return 0;if(n>=i)return-1;if(e>=r)return 1;if(e>>>=0,r>>>=0,n>>>=0,i>>>=0,this===t)return 0;for(var o=i-n,s=r-e,a=Math.min(o,s),c=this.slice(n,i),l=t.slice(e,r),f=0;f<a;++f)if(c[f]!==l[f]){o=c[f],s=l[f];break}return o<s?-1:s<o?1:0},u.prototype.includes=function(t,e,r){return-1!==this.indexOf(t,e,r)},u.prototype.indexOf=function(t,e,r){return v(this,t,e,r,!0)},u.prototype.lastIndexOf=function(t,e,r){return v(this,t,e,r,!1)},u.prototype.write=function(t,e,r,n){if(void 0===e)n="utf8",r=this.length,e=0;else if(void 0===r&&"string"==typeof e)n=e,r=this.length,e=0;else{if(!isFinite(e))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");e|=0,isFinite(r)?(r|=0,void 0===n&&(n="utf8")):(n=r,r=void 0)}var i=this.length-e;if((void 0===r||r>i)&&(r=i),t.length>0&&(r<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var o=!1;;)switch(n){case"hex":return m(this,t,e,r);case"utf8":case"utf-8":return g(this,t,e,r);case"ascii":return b(this,t,e,r);case"latin1":case"binary":return w(this,t,e,r);case"base64":return O(this,t,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return S(this,t,e,r);default:if(o)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),o=!0}},u.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var j=4096;function $(t,e,r){var n="";r=Math.min(t.length,r);for(var i=e;i<r;++i)n+=String.fromCharCode(127&t[i]);return n}function x(t,e,r){var n="";r=Math.min(t.length,r);for(var i=e;i<r;++i)n+=String.fromCharCode(t[i]);return n}function P(t,e,r){var n=t.length;(!e||e<0)&&(e=0),(!r||r<0||r>n)&&(r=n);for(var i="",o=e;o<r;++o)i+=I(t[o]);return i}function N(t,e,r){for(var n=t.slice(e,r),i="",o=0;o<n.length;o+=2)i+=String.fromCharCode(n[o]+256*n[o+1]);return i}function T(t,e,r){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+e>r)throw new RangeError("Trying to access beyond buffer length")}function k(t,e,r,n,i,o){if(!u.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>i||e<o)throw new RangeError('"value" argument is out of bounds');if(r+n>t.length)throw new RangeError("Index out of range")}function B(t,e,r,n){e<0&&(e=65535+e+1);for(var i=0,o=Math.min(t.length-r,2);i<o;++i)t[r+i]=(e&255<<8*(n?i:1-i))>>>8*(n?i:1-i)}function C(t,e,r,n){e<0&&(e=4294967295+e+1);for(var i=0,o=Math.min(t.length-r,4);i<o;++i)t[r+i]=e>>>8*(n?i:3-i)&255}function D(t,e,r,n,i,o){if(r+n>t.length)throw new RangeError("Index out of range");if(r<0)throw new RangeError("Index out of range")}function M(t,e,r,n,o){return o||D(t,0,r,4),i.write(t,e,r,n,23,4),r+4}function R(t,e,r,n,o){return o||D(t,0,r,8),i.write(t,e,r,n,52,8),r+8}u.prototype.slice=function(t,e){var r,n=this.length;if(t=~~t,e=void 0===e?n:~~e,t<0?(t+=n)<0&&(t=0):t>n&&(t=n),e<0?(e+=n)<0&&(e=0):e>n&&(e=n),e<t&&(e=t),u.TYPED_ARRAY_SUPPORT)(r=this.subarray(t,e)).__proto__=u.prototype;else{var i=e-t;r=new u(i,void 0);for(var o=0;o<i;++o)r[o]=this[o+t]}return r},u.prototype.readUIntLE=function(t,e,r){t|=0,e|=0,r||T(t,e,this.length);for(var n=this[t],i=1,o=0;++o<e&&(i*=256);)n+=this[t+o]*i;return n},u.prototype.readUIntBE=function(t,e,r){t|=0,e|=0,r||T(t,e,this.length);for(var n=this[t+--e],i=1;e>0&&(i*=256);)n+=this[t+--e]*i;return n},u.prototype.readUInt8=function(t,e){return e||T(t,1,this.length),this[t]},u.prototype.readUInt16LE=function(t,e){return e||T(t,2,this.length),this[t]|this[t+1]<<8},u.prototype.readUInt16BE=function(t,e){return e||T(t,2,this.length),this[t]<<8|this[t+1]},u.prototype.readUInt32LE=function(t,e){return e||T(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},u.prototype.readUInt32BE=function(t,e){return e||T(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},u.prototype.readIntLE=function(t,e,r){t|=0,e|=0,r||T(t,e,this.length);for(var n=this[t],i=1,o=0;++o<e&&(i*=256);)n+=this[t+o]*i;return n>=(i*=128)&&(n-=Math.pow(2,8*e)),n},u.prototype.readIntBE=function(t,e,r){t|=0,e|=0,r||T(t,e,this.length);for(var n=e,i=1,o=this[t+--n];n>0&&(i*=256);)o+=this[t+--n]*i;return o>=(i*=128)&&(o-=Math.pow(2,8*e)),o},u.prototype.readInt8=function(t,e){return e||T(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},u.prototype.readInt16LE=function(t,e){e||T(t,2,this.length);var r=this[t]|this[t+1]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt16BE=function(t,e){e||T(t,2,this.length);var r=this[t+1]|this[t]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt32LE=function(t,e){return e||T(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},u.prototype.readInt32BE=function(t,e){return e||T(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},u.prototype.readFloatLE=function(t,e){return e||T(t,4,this.length),i.read(this,t,!0,23,4)},u.prototype.readFloatBE=function(t,e){return e||T(t,4,this.length),i.read(this,t,!1,23,4)},u.prototype.readDoubleLE=function(t,e){return e||T(t,8,this.length),i.read(this,t,!0,52,8)},u.prototype.readDoubleBE=function(t,e){return e||T(t,8,this.length),i.read(this,t,!1,52,8)},u.prototype.writeUIntLE=function(t,e,r,n){(t=+t,e|=0,r|=0,n)||k(this,t,e,r,Math.pow(2,8*r)-1,0);var i=1,o=0;for(this[e]=255&t;++o<r&&(i*=256);)this[e+o]=t/i&255;return e+r},u.prototype.writeUIntBE=function(t,e,r,n){(t=+t,e|=0,r|=0,n)||k(this,t,e,r,Math.pow(2,8*r)-1,0);var i=r-1,o=1;for(this[e+i]=255&t;--i>=0&&(o*=256);)this[e+i]=t/o&255;return e+r},u.prototype.writeUInt8=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,1,255,0),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},u.prototype.writeUInt16LE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):B(this,t,e,!0),e+2},u.prototype.writeUInt16BE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):B(this,t,e,!1),e+2},u.prototype.writeUInt32LE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):C(this,t,e,!0),e+4},u.prototype.writeUInt32BE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):C(this,t,e,!1),e+4},u.prototype.writeIntLE=function(t,e,r,n){if(t=+t,e|=0,!n){var i=Math.pow(2,8*r-1);k(this,t,e,r,i-1,-i)}var o=0,s=1,a=0;for(this[e]=255&t;++o<r&&(s*=256);)t<0&&0===a&&0!==this[e+o-1]&&(a=1),this[e+o]=(t/s>>0)-a&255;return e+r},u.prototype.writeIntBE=function(t,e,r,n){if(t=+t,e|=0,!n){var i=Math.pow(2,8*r-1);k(this,t,e,r,i-1,-i)}var o=r-1,s=1,a=0;for(this[e+o]=255&t;--o>=0&&(s*=256);)t<0&&0===a&&0!==this[e+o+1]&&(a=1),this[e+o]=(t/s>>0)-a&255;return e+r},u.prototype.writeInt8=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,1,127,-128),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[e]=255&t,e+1},u.prototype.writeInt16LE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):B(this,t,e,!0),e+2},u.prototype.writeInt16BE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):B(this,t,e,!1),e+2},u.prototype.writeInt32LE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,4,2147483647,-2147483648),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):C(this,t,e,!0),e+4},u.prototype.writeInt32BE=function(t,e,r){return t=+t,e|=0,r||k(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):C(this,t,e,!1),e+4},u.prototype.writeFloatLE=function(t,e,r){return M(this,t,e,!0,r)},u.prototype.writeFloatBE=function(t,e,r){return M(this,t,e,!1,r)},u.prototype.writeDoubleLE=function(t,e,r){return R(this,t,e,!0,r)},u.prototype.writeDoubleBE=function(t,e,r){return R(this,t,e,!1,r)},u.prototype.copy=function(t,e,r,n){if(r||(r=0),n||0===n||(n=this.length),e>=t.length&&(e=t.length),e||(e=0),n>0&&n<r&&(n=r),n===r)return 0;if(0===t.length||0===this.length)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw new RangeError("sourceStart out of bounds");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-e<n-r&&(n=t.length-e+r);var i,o=n-r;if(this===t&&r<e&&e<n)for(i=o-1;i>=0;--i)t[i+e]=this[i+r];else if(o<1e3||!u.TYPED_ARRAY_SUPPORT)for(i=0;i<o;++i)t[i+e]=this[i+r];else Uint8Array.prototype.set.call(t,this.subarray(r,r+o),e);return o},u.prototype.fill=function(t,e,r,n){if("string"==typeof t){if("string"==typeof e?(n=e,e=0,r=this.length):"string"==typeof r&&(n=r,r=this.length),1===t.length){var i=t.charCodeAt(0);i<256&&(t=i)}if(void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!u.isEncoding(n))throw new TypeError("Unknown encoding: "+n)}else"number"==typeof t&&(t&=255);if(e<0||this.length<e||this.length<r)throw new RangeError("Out of range index");if(r<=e)return this;var o;if(e>>>=0,r=void 0===r?this.length:r>>>0,t||(t=0),"number"==typeof t)for(o=e;o<r;++o)this[o]=t;else{var s=u.isBuffer(t)?t:L(new u(t,n).toString()),a=s.length;for(o=0;o<r-e;++o)this[o+e]=s[o%a]}return this};var F=/[^+\/0-9A-Za-z-_]/g;function I(t){return t<16?"0"+t.toString(16):t.toString(16)}function L(t,e){var r;e=e||1/0;for(var n=t.length,i=null,o=[],s=0;s<n;++s){if((r=t.charCodeAt(s))>55295&&r<57344){if(!i){if(r>56319){(e-=3)>-1&&o.push(239,191,189);continue}if(s+1===n){(e-=3)>-1&&o.push(239,191,189);continue}i=r;continue}if(r<56320){(e-=3)>-1&&o.push(239,191,189),i=r;continue}r=65536+(i-55296<<10|r-56320)}else i&&(e-=3)>-1&&o.push(239,191,189);if(i=null,r<128){if((e-=1)<0)break;o.push(r)}else if(r<2048){if((e-=2)<0)break;o.push(r>>6|192,63&r|128)}else if(r<65536){if((e-=3)<0)break;o.push(r>>12|224,r>>6&63|128,63&r|128)}else{if(!(r<1114112))throw new Error("Invalid code point");if((e-=4)<0)break;o.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}}return o}function U(t){return n.toByteArray(function(t){if((t=function(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}(t).replace(F,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}(t))}function V(t,e,r,n){for(var i=0;i<n&&!(i+r>=e.length||i>=t.length);++i)e[i+r]=t[i];return i}}).call(this,r(11))},function(t,e,r){"use strict";(function(t){
/*!
 * Module dependencies.
 */
var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(111),o=r(44),s=r(62),a=r(45).Buffer,u=r(19),c=r(13),l=r(113),f=r(46),h=r(20),p=r(65),y=r(64),d=r(27),v=r(24),_=r(47),m=void 0;e.specialProperties=_,
/*!
 * Produces a collection name from model `name`. By default, just returns
 * the model name
 *
 * @param {String} name a model name
 * @param {Function} pluralize function that pluralizes the collection name
 * @return {String} a collection name
 * @api private
 */
e.toCollectionName=function(t,e){return"system.profile"===t?t:"system.indexes"===t?t:"function"==typeof e?e(t):t},
/*!
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */
e.deepEqual=function t(r,i){if(r===i)return!0;if(r instanceof Date&&i instanceof Date)return r.getTime()===i.getTime();if(p(r,"ObjectID")&&p(i,"ObjectID")||p(r,"Decimal128")&&p(i,"Decimal128"))return r.toString()===i.toString();if(r instanceof RegExp&&i instanceof RegExp)return r.source===i.source&&r.ignoreCase===i.ignoreCase&&r.multiline===i.multiline&&r.global===i.global;if("object"!==(void 0===r?"undefined":n(r))&&"object"!==(void 0===i?"undefined":n(i)))return r==i;if(null===r||null===i||void 0===r||void 0===i)return!1;if(r.prototype!==i.prototype)return!1;if(r instanceof Number&&i instanceof Number)return r.valueOf()===i.valueOf();if(a.isBuffer(r))return e.buffer.areEqual(r,i);d(r)&&(r=r.toObject()),d(i)&&(i=i.toObject());var o=void 0,s=void 0,u=void 0,c=void 0;try{o=Object.keys(r),s=Object.keys(i)}catch(t){return!1}if(o.length!==s.length)return!1;for(o.sort(),s.sort(),c=o.length-1;c>=0;c--)if(o[c]!==s[c])return!1;for(c=o.length-1;c>=0;c--)if(!t(r[u=o[c]],i[u]))return!1;return!0},
/*!
 * Get the last element of an array
 */
e.last=function(t){if(t.length>0)return t[t.length-1]},e.clone=f,
/*!
 * ignore
 */
e.promiseOrCallback=v,
/*!
 * ignore
 */
e.omit=function(t,e){if(null==e)return Object.assign({},t);Array.isArray(e)||(e=[e]);var r=Object.assign({},t),n=!0,i=!1,o=void 0;try{for(var s,a=e[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){delete r[s.value]}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}return r},
/*!
 * Shallow copies defaults into options.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 * @api private
 */
e.options=function(t,e){var r=Object.keys(t),n=r.length,i=void 0;for(e=e||{};n--;)(i=r[n])in e||(e[i]=t[i]);return e},
/*!
 * Generates a random string
 *
 * @api private
 */
e.random=function(){return Math.random().toString().substr(3)},
/*!
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */
e.merge=function t(r,n,i,o){i=i||{};var s=Object.keys(n),a=0,u=s.length,l=void 0;o=o||"";for(var f=i.omitNested||{};a<u;)if(l=s[a++],!(i.omit&&i.omit[l]||f[o]||_.has(l)))if(null==r[l])r[l]=n[l];else if(e.isObject(n[l])){if(e.isObject(r[l])||(r[l]={}),null!=n[l]){if(n[l].instanceOfSchema){r[l].instanceOfSchema?r[l].add(n[l].clone()):r[l]=n[l].clone();continue}if(n[l]instanceof c){r[l]=new c(n[l]);continue}}t(r[l],n[l],i,o?o+"."+l:l)}else i.overwrite&&(r[l]=n[l])},
/*!
 * Applies toObject recursively.
 *
 * @param {Document|Array|Object} obj
 * @return {Object}
 * @api private
 */
e.toObject=function t(n){m||(m=r(6));var i=void 0;if(null==n)return n;if(n instanceof m)return n.toObject();if(Array.isArray(n)){i=[];var o=!0,s=!1,a=void 0;try{for(var u,c=n[Symbol.iterator]();!(o=(u=c.next()).done);o=!0){var l=u.value;i.push(t(l))}}catch(t){s=!0,a=t}finally{try{!o&&c.return&&c.return()}finally{if(s)throw a}}return i}if(e.isPOJO(n)){for(var f in i={},n)_.has(f)||(i[f]=t(n[f]));return i}return n},e.isObject=h,
/*!
 * Determines if `arg` is a plain old JavaScript object (POJO). Specifically,
 * `arg` must be an object but not an instance of any special class, like String,
 * ObjectId, etc.
 *
 * `Object.getPrototypeOf()` is part of ES5: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getPrototypeOf
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */
e.isPOJO=function(t){if(null==t||"object"!==(void 0===t?"undefined":n(t)))return!1;var e=Object.getPrototypeOf(t);return!e||"Object"===e.constructor.name},
/*!
 * Determines if `obj` is a built-in object like an array, date, boolean,
 * etc.
 */
e.isNativeObject=function(t){return Array.isArray(t)||t instanceof Date||t instanceof Boolean||t instanceof Number||t instanceof String},
/*!
 * Determines if `val` is an object that has no own keys
 */
e.isEmptyObject=function(t){return null!=t&&"object"===(void 0===t?"undefined":n(t))&&0===Object.keys(t).length},
/*!
 * Search if `obj` or any POJOs nested underneath `obj` has a property named
 * `key`
 */
e.hasKey=function(t,r){var n=Object.keys(t),i=!0,o=!1,s=void 0;try{for(var a,u=n[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var c=a.value;if(c===r)return!0;if(e.isPOJO(t[c])&&e.hasKey(t[c],r))return!0}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}return!1},
/*!
 * A faster Array.prototype.slice.call(arguments) alternative
 * @api private
 */
e.args=s,
/*!
 * process.nextTick helper.
 *
 * Wraps `callback` in a try/catch + nextTick.
 *
 * node-mongodb-native has a habit of state corruption when an error is immediately thrown from within a collection callback.
 *
 * @param {Function} callback
 * @api private
 */
e.tick=function(e){if("function"==typeof e)return function(){try{e.apply(this,arguments)}catch(e){t.nextTick(function(){throw e})}}},
/*!
 * Returns true if `v` is an object that can be serialized as a primitive in
 * MongoDB
 */
e.isMongooseType=function(t){return t instanceof c||t instanceof u||t instanceof a},e.isMongooseObject=d,
/*!
 * Converts `expires` options of index objects to `expiresAfterSeconds` options for MongoDB.
 *
 * @param {Object} object
 * @api private
 */
e.expires=function(t){if(t&&"Object"===t.constructor.name&&"expires"in t){var e=void 0;e="string"!=typeof t.expires?t.expires:Math.round(i(t.expires)/1e3),t.expireAfterSeconds=e,delete t.expires}},
/*!
 * populate helper
 */
e.populate=function(t,r,i,o,s,a,u,c){var f=null;if(1===arguments.length){if(t instanceof l)return[t];if(Array.isArray(t))return function(t){var e=[];return t.forEach(function(t){/[\s]/.test(t.path)?t.path.split(" ").forEach(function(r){var n=Object.assign({},t);n.path=r,e.push(n)}):e.push(t)}),e}(t).map(function(t){return e.populate(t)[0]});f=e.isObject(t)?Object.assign({},t):{path:t}}else f="object"===(void 0===i?"undefined":n(i))?{path:t,select:r,match:i,options:o}:{path:t,select:r,model:i,match:o,options:s,populate:a,justOne:u,count:c};if("string"!=typeof f.path)throw new TypeError("utils.populate: invalid path. Expected string. Got typeof `"+(void 0===t?"undefined":n(t))+"`");return function(t){if(Array.isArray(t.populate)){var r=[];t.populate.forEach(function(t){if(/[\s]/.test(t.path)){var n=Object.assign({},t),i=n.path.split(" ");i.forEach(function(t){n.path=t,r.push(e.populate(n)[0])})}else r.push(e.populate(t)[0])}),t.populate=e.populate(r)}else null!=t.populate&&"object"===n(t.populate)&&(t.populate=e.populate(t.populate));var i=[],o=t.path.split(" ");null!=t.options&&(t.options=e.clone(t.options));var s=!0,a=!1,u=void 0;try{for(var c,f=o[Symbol.iterator]();!(s=(c=f.next()).done);s=!0){var h=c.value;i.push(new l(Object.assign({},t,{path:h})))}}catch(t){a=!0,u=t}finally{try{!s&&f.return&&f.return()}finally{if(a)throw u}}return i}
/*!
 * Return the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Object} obj
 */(f)},e.getValue=function(t,e,r){return o.get(t,e,"_doc",r)},
/*!
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} obj
 */
e.setValue=function(t,e,r,n,i){o.set(t,e,r,"_doc",n,i)},
/*!
 * Returns an array of values from object `o`.
 *
 * @param {Object} o
 * @return {Array}
 * @private
 */
e.object={},e.object.vals=function(t){for(var e=Object.keys(t),r=e.length,n=[];r--;)n.push(t[e[r]]);return n},
/*!
 * @see exports.options
 */
e.object.shallowCopy=e.options;
/*!
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 */
var g=Object.prototype.hasOwnProperty;e.object.hasOwnProperty=function(t,e){return g.call(t,e)},
/*!
 * Determine if `val` is null or undefined
 *
 * @return {Boolean}
 */
e.isNullOrUndefined=function(t){return null===t||void 0===t},
/*!
 * ignore
 */
e.array={},
/*!
 * Flattens an array.
 *
 * [ 1, [ 2, 3, [4] ]] -> [1,2,3,4]
 *
 * @param {Array} arr
 * @param {Function} [filter] If passed, will be invoked with each item in the array. If `filter` returns a falsy value, the item will not be included in the results.
 * @return {Array}
 * @private
 */
e.array.flatten=function t(e,r,n){return n||(n=[]),e.forEach(function(e){Array.isArray(e)?t(e,r,n):r&&!r(e)||n.push(e)}),n};
/*!
 * ignore
 */
var b=Object.prototype.hasOwnProperty;e.hasUserDefinedProperty=function(t,r){if(null==t)return!1;if(Array.isArray(r)){var i=!0,o=!1,s=void 0;try{for(var a,u=r[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var c=a.value;if(e.hasUserDefinedProperty(t,c))return!0}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}return!1}if(b.call(t,r))return!0;if("object"===(void 0===t?"undefined":n(t))&&r in t){var l=t[r];return l!==Object.prototype[r]&&l!==Array.prototype[r]}return!1};
/*!
 * ignore
 */
var w=Math.pow(2,32)-1;e.isArrayIndex=function(t){return"number"==typeof t?t>=0&&t<=w:"string"==typeof t&&(!!/^\d+$/.test(t)&&((t=+t)>=0&&t<=w))},
/*!
 * Removes duplicate values from an array
 *
 * [1, 2, 3, 3, 5] => [1, 2, 3, 5]
 * [ ObjectId("550988ba0c19d57f697dc45e"), ObjectId("550988ba0c19d57f697dc45e") ]
 *    => [ObjectId("550988ba0c19d57f697dc45e")]
 *
 * @param {Array} arr
 * @return {Array}
 * @private
 */
e.array.unique=function(t){var e={},r={},n=[],i=!0,o=!1,s=void 0;try{for(var a,u=t[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var l=a.value;if("number"==typeof l||"string"==typeof l||null==l){if(e[l])continue;n.push(l),e[l]=!0}else if(l instanceof c){if(r[l.toString()])continue;n.push(l),r[l.toString()]=!0}else n.push(l)}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}return n},
/*!
 * Determines if two buffers are equal.
 *
 * @param {Buffer} a
 * @param {Object} b
 */
e.buffer={},e.buffer.areEqual=function(t,e){if(!a.isBuffer(t))return!1;if(!a.isBuffer(e))return!1;if(t.length!==e.length)return!1;for(var r=0,n=t.length;r<n;++r)if(t[r]!==e[r])return!1;return!0},e.getFunctionName=y,
/*!
 * Decorate buffers
 */
e.decorate=function(t,e){for(var r in e)_.has(r)||(t[r]=e[r])},e.mergeClone=function(t,r){d(r)&&(r=r.toObject({transform:!1,virtuals:!1,depopulate:!0,getters:!1,flattenDecimals:!1}));for(var n=Object.keys(r),i=n.length,o=0,s=void 0;o<i;)if(s=n[o++],!_.has(s))if(void 0===t[s])t[s]=e.clone(r[s],{transform:!1,virtuals:!1,depopulate:!0,getters:!1,flattenDecimals:!1});else{var u=r[s];if(null==u||!u.valueOf||u instanceof Date||(u=u.valueOf()),e.isObject(u)){var c=u;d(u)&&!u.isMongooseBuffer&&(c=c.toObject({transform:!1,virtuals:!1,depopulate:!0,getters:!1,flattenDecimals:!1})),u.isMongooseBuffer&&(c=a.from(c)),e.mergeClone(t[s],c)}else t[s]=e.clone(u,{flattenDecimals:!1})}},e.each=function(t,e){var r=!0,n=!1,i=void 0;try{for(var o,s=t[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){e(o.value)}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}},
/*!
 * ignore
 */
e.getOption=function(t){var e=Array.prototype.slice.call(arguments,1),r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;if(null!=a[t])return a[t]}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return null},
/*!
 * ignore
 */
e.noop=function(){}}).call(this,r(8))},function(t,e,r){"use strict";(function(t){var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=Object.getOwnPropertyDescriptors||function(t){for(var e=Object.keys(t),r={},n=0;n<e.length;n++)r[e[n]]=Object.getOwnPropertyDescriptor(t,e[n]);return r},o=/%[sdj%]/g;e.format=function(t){if(!m(t)){for(var e=[],r=0;r<arguments.length;r++)e.push(u(arguments[r]));return e.join(" ")}r=1;for(var n=arguments,i=n.length,s=String(t).replace(o,function(t){if("%%"===t)return"%";if(r>=i)return t;switch(t){case"%s":return String(n[r++]);case"%d":return Number(n[r++]);case"%j":try{return JSON.stringify(n[r++])}catch(t){return"[Circular]"}default:return t}}),a=n[r];r<i;a=n[++r])v(a)||!w(a)?s+=" "+a:s+=" "+u(a);return s},e.deprecate=function(r,n){if(void 0!==t&&!0===t.noDeprecation)return r;if(void 0===t)return function(){return e.deprecate(r,n).apply(this,arguments)};var i=!1;return function(){if(!i){if(t.throwDeprecation)throw new Error(n);t.traceDeprecation?console.trace(n):console.error(n),i=!0}return r.apply(this,arguments)}};var s,a={};function u(t,r){var n={seen:[],stylize:l};return arguments.length>=3&&(n.depth=arguments[2]),arguments.length>=4&&(n.colors=arguments[3]),d(r)?n.showHidden=r:r&&e._extend(n,r),g(n.showHidden)&&(n.showHidden=!1),g(n.depth)&&(n.depth=2),g(n.colors)&&(n.colors=!1),g(n.customInspect)&&(n.customInspect=!0),n.colors&&(n.stylize=c),f(n,t,n.depth)}function c(t,e){var r=u.styles[e];return r?"["+u.colors[r][0]+"m"+t+"["+u.colors[r][1]+"m":t}function l(t,e){return t}function f(t,r,n){if(t.customInspect&&r&&E(r.inspect)&&r.inspect!==e.inspect&&(!r.constructor||r.constructor.prototype!==r)){var i=r.inspect(n,t);return m(i)||(i=f(t,i,n)),i}var o=function(t,e){if(g(e))return t.stylize("undefined","undefined");if(m(e)){var r="'"+JSON.stringify(e).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return t.stylize(r,"string")}if(_(e))return t.stylize(""+e,"number");if(d(e))return t.stylize(""+e,"boolean");if(v(e))return t.stylize("null","null")}(t,r);if(o)return o;var s=Object.keys(r),a=function(t){var e={};return t.forEach(function(t,r){e[t]=!0}),e}(s);if(t.showHidden&&(s=Object.getOwnPropertyNames(r)),S(r)&&(s.indexOf("message")>=0||s.indexOf("description")>=0))return h(r);if(0===s.length){if(E(r)){var u=r.name?": "+r.name:"";return t.stylize("[Function"+u+"]","special")}if(b(r))return t.stylize(RegExp.prototype.toString.call(r),"regexp");if(O(r))return t.stylize(Date.prototype.toString.call(r),"date");if(S(r))return h(r)}var c,l="",w=!1,A=["{","}"];(y(r)&&(w=!0,A=["[","]"]),E(r))&&(l=" [Function"+(r.name?": "+r.name:"")+"]");return b(r)&&(l=" "+RegExp.prototype.toString.call(r)),O(r)&&(l=" "+Date.prototype.toUTCString.call(r)),S(r)&&(l=" "+h(r)),0!==s.length||w&&0!=r.length?n<0?b(r)?t.stylize(RegExp.prototype.toString.call(r),"regexp"):t.stylize("[Object]","special"):(t.seen.push(r),c=w?function(t,e,r,n,i){for(var o=[],s=0,a=e.length;s<a;++s)x(e,String(s))?o.push(p(t,e,r,n,String(s),!0)):o.push("");return i.forEach(function(i){i.match(/^\d+$/)||o.push(p(t,e,r,n,i,!0))}),o}(t,r,n,a,s):s.map(function(e){return p(t,r,n,a,e,w)}),t.seen.pop(),function(t,e,r){if(t.reduce(function(t,e){return 0,e.indexOf("\n")>=0&&0,t+e.replace(/\u001b\[\d\d?m/g,"").length+1},0)>60)return r[0]+(""===e?"":e+"\n ")+" "+t.join(",\n  ")+" "+r[1];return r[0]+e+" "+t.join(", ")+" "+r[1]}(c,l,A)):A[0]+l+A[1]}function h(t){return"["+Error.prototype.toString.call(t)+"]"}function p(t,e,r,n,i,o){var s,a,u;if((u=Object.getOwnPropertyDescriptor(e,i)||{value:e[i]}).get?a=u.set?t.stylize("[Getter/Setter]","special"):t.stylize("[Getter]","special"):u.set&&(a=t.stylize("[Setter]","special")),x(n,i)||(s="["+i+"]"),a||(t.seen.indexOf(u.value)<0?(a=v(r)?f(t,u.value,null):f(t,u.value,r-1)).indexOf("\n")>-1&&(a=o?a.split("\n").map(function(t){return"  "+t}).join("\n").substr(2):"\n"+a.split("\n").map(function(t){return"   "+t}).join("\n")):a=t.stylize("[Circular]","special")),g(s)){if(o&&i.match(/^\d+$/))return a;(s=JSON.stringify(""+i)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(s=s.substr(1,s.length-2),s=t.stylize(s,"name")):(s=s.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),s=t.stylize(s,"string"))}return s+": "+a}function y(t){return Array.isArray(t)}function d(t){return"boolean"==typeof t}function v(t){return null===t}function _(t){return"number"==typeof t}function m(t){return"string"==typeof t}function g(t){return void 0===t}function b(t){return w(t)&&"[object RegExp]"===A(t)}function w(t){return"object"===(void 0===t?"undefined":n(t))&&null!==t}function O(t){return w(t)&&"[object Date]"===A(t)}function S(t){return w(t)&&("[object Error]"===A(t)||t instanceof Error)}function E(t){return"function"==typeof t}function A(t){return Object.prototype.toString.call(t)}function j(t){return t<10?"0"+t.toString(10):t.toString(10)}e.debuglog=function(r){if(g(s)&&(s=t.env.NODE_DEBUG||""),r=r.toUpperCase(),!a[r])if(new RegExp("\\b"+r+"\\b","i").test(s)){var n=t.pid;a[r]=function(){var t=e.format.apply(e,arguments);console.error("%s %d: %s",r,n,t)}}else a[r]=function(){};return a[r]},e.inspect=u,u.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},u.styles={special:"cyan",number:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",date:"magenta",regexp:"red"},e.isArray=y,e.isBoolean=d,e.isNull=v,e.isNullOrUndefined=function(t){return null==t},e.isNumber=_,e.isString=m,e.isSymbol=function(t){return"symbol"===(void 0===t?"undefined":n(t))},e.isUndefined=g,e.isRegExp=b,e.isObject=w,e.isDate=O,e.isError=S,e.isFunction=E,e.isPrimitive=function(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"===(void 0===t?"undefined":n(t))||void 0===t},e.isBuffer=r(100);var $=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function x(t,e){return Object.prototype.hasOwnProperty.call(t,e)}e.log=function(){console.log("%s - %s",function(){var t=new Date,e=[j(t.getHours()),j(t.getMinutes()),j(t.getSeconds())].join(":");return[t.getDate(),$[t.getMonth()],e].join(" ")}(),e.format.apply(e,arguments))},e.inherits=r(101),e._extend=function(t,e){if(!e||!w(e))return t;for(var r=Object.keys(e),n=r.length;n--;)t[r[n]]=e[r[n]];return t};var P="undefined"!=typeof Symbol?Symbol("util.promisify.custom"):void 0;function N(t,e){if(!t){var r=new Error("Promise was rejected with a falsy value");r.reason=t,t=r}return e(t)}e.promisify=function(t){if("function"!=typeof t)throw new TypeError('The "original" argument must be of type Function');if(P&&t[P]){var e;if("function"!=typeof(e=t[P]))throw new TypeError('The "util.promisify.custom" argument must be of type Function');return Object.defineProperty(e,P,{value:e,enumerable:!1,writable:!1,configurable:!0}),e}function e(){for(var e,r,n=new Promise(function(t,n){e=t,r=n}),i=[],o=0;o<arguments.length;o++)i.push(arguments[o]);i.push(function(t,n){t?r(t):e(n)});try{t.apply(this,i)}catch(t){r(t)}return n}return Object.setPrototypeOf(e,Object.getPrototypeOf(t)),P&&Object.defineProperty(e,P,{value:e,enumerable:!1,writable:!1,configurable:!0}),Object.defineProperties(e,i(t))},e.promisify.custom=P,e.callbackify=function(e){if("function"!=typeof e)throw new TypeError('The "original" argument must be of type Function');function r(){for(var r=[],n=0;n<arguments.length;n++)r.push(arguments[n]);var i=r.pop();if("function"!=typeof i)throw new TypeError("The last argument must be of type Function");var o=this,s=function(){return i.apply(o,arguments)};e.apply(this,r).then(function(e){t.nextTick(s,null,e)},function(e){t.nextTick(N,e,s)})}return Object.setPrototypeOf(r,Object.getPrototypeOf(e)),Object.defineProperties(r,i(e)),r}}).call(this,r(8))},function(t,e,r){"use strict";var n=r(16);
/*!
 * Module exports.
 */t.exports=n,n.messages=r(125),n.Messages=n.messages,n.DocumentNotFoundError=r(126),n.CastError=r(12),n.ValidationError=r(29),n.ValidatorError=r(70),n.VersionError=r(127),n.ParallelSaveError=r(128),n.OverwriteModelError=r(129),n.MissingSchemaError=r(130),n.DivergentArrayError=r(131),n.StrictModeError=r(30)},function(t,e,r){"use strict";
/*!
 * Simplified lodash.get to work around the annoying null quirk. See:
 * https://github.com/lodash/lodash/issues/3659
 */function n(t,e){return null==t?t:t instanceof Map?t.get(e):t[e]}t.exports=function(t,e,r){var i=e.split("."),o=e,s=t,a=!0,u=!1,c=void 0;try{for(var l,f=i[Symbol.iterator]();!(a=(l=f.next()).done);a=!0){var h=l.value;if(null==s)return r;if(null!=s[o])return s[o];s=n(s,h),o=o.substr(h.length+1)}}catch(t){u=!0,c=t}finally{try{!a&&f.return&&f.return()}finally{if(u)throw c}}return null==s?r:s}},function(t,e,r){"use strict";(function(e,n){
/*!
 * Module dependencies.
 */
var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};function o(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var s=r(18).EventEmitter,a=r(109),u=r(4),c=r(31),l=r(72),f=r(133),h=r(134),p=r(52),y=r(30),d=r(29),v=r(70),_=r(53),m=r(24),g=r(83),b=r(58).compile,w=r(58).defineKey,O=r(168).flatten,S=r(5),E=r(169),A=r(87),j=r(170),$=r(92),x=r(171),P=r(3).inspect,N=r(22).internalToObjectOptions,T=r(44),k=r(2),B=k.clone,C=k.deepEqual,D=k.isMongooseObject,M=r(0).arrayAtomicsSymbol,R=r(0).documentArrayParent,F=r(0).documentSchemaSymbol,I=r(0).getSymbol,L=r(0).populateModelSymbol,U=r(0).scopeSymbol,V=void 0,q=void 0,W=void 0,H=k.specialProperties;function Y(t,e,r,n){var o=this;if("object"===(void 0===r?"undefined":i(r))&&null!=r&&(r=(n=r).skipId),n=n||{},null==this.schema){var u=k.isObject(e)&&!e.instanceOfSchema?new p(e):e;this.$__setSchema(u),e=r,r=n,n=arguments[4]||{}}if(this.$__=new a,this.$__.emitter=new s,this.isNew=!("isNew"in n)||n.isNew,this.errors=void 0,this.$__.$options=n||{},this.$locals={},this.$op=null,null!=t&&"object"!==(void 0===t?"undefined":i(t)))throw new f(t,"obj","Document");var c=this.schema;"boolean"==typeof e||"throw"===e?(this.$__.strictMode=e,e=void 0):(this.$__.strictMode=c.options.strict,this.$__.selected=e);var l=c.requiredPaths(!0),h=!0,y=!1,d=void 0;try{for(var v,_=l[Symbol.iterator]();!(h=(v=_.next()).done);h=!0){var m=v.value;this.$__.activePaths.require(m)}}catch(t){y=!0,d=t}finally{try{!h&&_.return&&_.return()}finally{if(y)throw d}}this.$__.emitter.setMaxListeners(0);var g=null;k.isPOJO(e)&&(g=x(e));var b=!1===g&&e?
/*!
 * ignore
 */
function(t){var e={},r=Object.keys(t),n=!0,i=!1,o=void 0;try{for(var s,a=r[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value,c=u.split("."),l=[],f=!0,h=!1,p=void 0;try{for(var y,d=c[Symbol.iterator]();!(f=(y=d.next()).done);f=!0){var v=y.value;l.push(v),e[l.join(".")]=1}}catch(t){h=!0,p=t}finally{try{!f&&d.return&&d.return()}finally{if(h)throw p}}}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}return e}
/*!
 * ignore
 */(e):{};if(null==this._doc&&(this.$__buildDoc(t,e,r,g,b,!1),K(this,e,r,g,b,!0,{isNew:this.isNew})),t&&(this.$__original_set?this.$__original_set(t,void 0,!0):this.$set(t,void 0,!0),t instanceof Y&&(this.isNew=t.isNew)),n.willInit?s.prototype.once.call(this,"init",function(){K(o,e,r,g,b,!1,n.skipDefaults,o.isNew)}):K(this,e,r,g,b,!1,n.skipDefaults,this.isNew),this.$__._id=this._id,!this.$__.strictMode&&t){var O=this;Object.keys(this._doc).forEach(function(t){t in c.tree||w(t,null,O)})}!
/*!
 * Runs queued functions
 */
function(t){var e=t.schema&&t.schema.callQueue;if(!e.length)return;var r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;"pre"!==a[0]&&"post"!==a[0]&&"on"!==a[0]&&t[a[0]].apply(t,a[1])}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}}
/*!
 * ignore
 */(this)}
/*!
 * Document exposes the NodeJS event emitter API, so you can use
 * `on`, `once`, etc.
 */for(var z in k.each(["on","once","emit","listeners","removeListener","setMaxListeners","removeAllListeners","addListener"],function(t){Y.prototype[t]=function(){return this.$__.emitter[t].apply(this.$__.emitter,arguments)}}),Y.prototype.constructor=Y,s.prototype)Y[z]=s.prototype[z];function K(t,e,r,n,i,o,s){for(var a=Object.keys(t.schema.paths),u=a.length,c=0;c<u;++c){var l=void 0,f="",h=a[c];if("_id"!==h||!r)for(var p=t.schema.paths[h],y=-1===h.indexOf(".")?[h]:h.split("."),d=y.length,v=!1,_=t._doc,m=0;m<d&&null!=_;++m){var g=y[m];if(f+=(f.length?".":"")+g,!0===n){if(f in e)break}else if(!1===n&&e&&!v)if(f in e)v=!0;else if(!i[f])break;if(m===d-1){if(void 0!==_[g])break;if("function"==typeof p.defaultValue){if(!p.defaultValue.$runBeforeSetters&&o)break;if(p.defaultValue.$runBeforeSetters&&!o)break}else if(!o)continue;if(s&&s[f])break;if(e&&null!==n)if(!0===n){if(h in e)continue;void 0!==(l=p.getDefault(t,!1))&&(_[g]=l,t.$__.activePaths.default(h))}else v&&void 0!==(l=p.getDefault(t,!1))&&(_[g]=l,t.$__.activePaths.default(h));else void 0!==(l=p.getDefault(t,!1))&&(_[g]=l,t.$__.activePaths.default(h))}else _=_[g]}}}
/*!
 * ignore
 */
function Q(t){var e={};!
/*!
 * ignore
 */
function(t){Object.keys(t.$__.activePaths.states.require).forEach(function(e){var r=t.schema.path(e);null!=r&&"function"==typeof r.originalRequiredValue&&(t.$__.cachedRequired[e]=r.originalRequiredValue.call(t))})}(t);var r=new Set(Object.keys(t.$__.activePaths.states.require).filter(function(e){return!(!t.isSelected(e)&&!t.isModified(e))&&(!(e in t.$__.cachedRequired)||t.$__.cachedRequired[e])}));function n(t){r.add(t)}Object.keys(t.$__.activePaths.states.init).forEach(n),Object.keys(t.$__.activePaths.states.modify).forEach(n),Object.keys(t.$__.activePaths.states.default).forEach(n);var i=t.$__getAllSubdocs(),o=t.modifiedPaths(),s=!0,a=!1,u=void 0;try{for(var c,l=i[Symbol.iterator]();!(s=(c=l.next()).done);s=!0){var f=c.value;if(f.$basePath){var h=!0,p=!1,y=void 0;try{for(var d,v=r[Symbol.iterator]();!(h=(d=v.next()).done);h=!0){var _=d.value;(null===_||_.startsWith(f.$basePath+"."))&&r.delete(_)}}catch(t){p=!0,y=t}finally{try{!h&&v.return&&v.return()}finally{if(p)throw y}}!t.isModified(f.$basePath,o)||t.isDirectModified(f.$basePath)||t.$isDefault(f.$basePath)||(r.add(f.$basePath),e[f.$basePath]=!0)}}}catch(t){a=!0,u=t}finally{try{!s&&l.return&&l.return()}finally{if(a)throw u}}var m=!0,g=!1,b=void 0;try{for(var w,E=r[Symbol.iterator]();!(m=(w=E.next()).done);m=!0){var A=w.value,j=t.schema.path(A);if(j&&j.$isMongooseArray&&(!j.$isMongooseDocumentArray||S(j,"schemaOptions.required")))$(t.$__getValue(A),r,A)}}catch(t){g=!0,b=t}finally{try{!m&&E.return&&E.return()}finally{if(g)throw b}}function $(t,e,r){if(null!=t)for(var n=t.length,i=0;i<n;++i)Array.isArray(t[i])?$(t[i],e,r+"."+i):e.add(r+"."+i)}var x={skipArrays:!0},P=!0,N=!1,T=void 0;try{for(var k,B=r[Symbol.iterator]();!(P=(k=B.next()).done);P=!0){var C=k.value;if(t.schema.nested[C]){var M=t.$__getValue(C);D(M)&&(M=M.toObject({transform:!1}));var R=O(M,C,x,t.schema);Object.keys(R).forEach(n)}}}catch(t){N=!0,T=t}finally{try{!P&&B.return&&B.return()}finally{if(N)throw T}}var F=!0,I=!1,L=void 0;try{for(var U,V=r[Symbol.iterator]();!(F=(U=V.next()).done);F=!0){var q=U.value;if(t.schema.singleNestedPaths.hasOwnProperty(q))r.delete(q);else{var W=t.schema.path(q);if(W&&W.$isSchemaMap){var H=t.$__getValue(q);if(null!=H){var Y=!0,z=!1,K=void 0;try{for(var Q,J=H.keys()[Symbol.iterator]();!(Y=(Q=J.next()).done);Y=!0){var G=Q.value;r.add(q+"."+G)}}catch(t){z=!0,K=t}finally{try{!Y&&J.return&&J.return()}finally{if(z)throw K}}}}}}}catch(t){I=!0,L=t}finally{try{!F&&V.return&&V.return()}finally{if(I)throw L}}return[r=Array.from(r),e]}
/*!
 * ignore
 */
/*!
 * ignore
 */
function J(t,e){var r=new Set(e),n=new Map([]),i=!0,o=!1,s=void 0;try{for(var a,u=e[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var c=a.value;if(-1!==c.indexOf("."))for(var l=c.split("."),f=l[0],h=1;h<l.length;++h)n.set(f,c),f=f+"."+l[h]}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}var p=[],y=!0,d=!1,v=void 0;try{for(var _,m=t[Symbol.iterator]();!(y=(_=m.next()).done);y=!0){var g=_.value;r.has(g)?p.push(g):n.has(g)&&p.push(n.get(g))}}catch(t){d=!0,v=t}finally{try{!y&&m.return&&m.return()}finally{if(d)throw v}}return p}
/*!
 * Applies virtuals properties to `json`.
 */
function G(t,e,r,n){var i=t.schema,o=Object.keys(i.virtuals),s=o.length,a=s,u=void 0,c=void 0,l=t._doc,f=void 0,h=S(n,"aliases",!0);if(!l)return e;for(r=r||{},s=0;s<a;++s)if(u=o[s],h||!i.aliases.hasOwnProperty(u)){if(c=u,null!=r.path){if(!u.startsWith(r.path+"."))continue;c=u.substr(r.path.length+1)}var p=c.split(".");if(void 0!==(f=B(t.get(u),r))){var y=p.length;l=e;for(var d=0;d<y-1;++d)l[p[d]]=l[p[d]]||{},l=l[p[d]];l[p[y-1]]=f}}return e}
/*!
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @return {Object} `json`
 */Y.prototype.schema,Object.defineProperty(Y.prototype,"$locals",{configurable:!1,enumerable:!1,writable:!0}),Y.prototype.isNew,Y.prototype.id,Y.prototype.errors,Y.prototype.$op,Y.prototype.$__buildDoc=function(t,e,r,n,i){for(var o={},s=Object.keys(this.schema.paths).filter(function(t){return!t.includes("$*")}),a=s.length,u=0;u<a;++u){var c=s[u];if("_id"===c){if(r)continue;if(t&&"_id"in t)continue}for(var l=c.split("."),f=l.length,h=f-1,p="",y=o,d=!1,v=0;v<f;++v){var _=l[v];if(p+=(p.length?".":"")+_,!0===n){if(p in e)break}else if(!1===n&&e&&!d)if(p in e)d=!0;else if(!i[p])break;v<h&&(y=y[_]||(y[_]={}))}}this._doc=o},
/*!
 * Converts to POJO when you use the document for querying
 */
Y.prototype.toBSON=function(){return this.toObject(N)},Y.prototype.init=function(t,e,r){return"function"==typeof e&&(r=e,e=null),this.$__init(t,e),r&&r(null,this),this},
/*!
 * ignore
 */
Y.prototype.$__init=function(t,e){if(this.isNew=!1,this.$init=!0,e=e||{},null!=t._id&&e.populated&&e.populated.length){var r=String(t._id),n=!0,i=!1,o=void 0;try{for(var s,a=e.populated[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value;u.isVirtual?this.populated(u.path,k.getValue(u.path,t),u):this.populated(u.path,u._docs[r],u)}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}}
/*!
 * Init helper.
 *
 * @param {Object} self document instance
 * @param {Object} obj raw mongodb doc
 * @param {Object} doc object we are initializing
 * @api private
 */
return function t(e,r,n,i,o){o=o||"";var s=Object.keys(r);var a=s.length;var u=void 0;var c=void 0;var l=void 0;var f=0;for(;f<a;)h(f++);function h(a){if(l=s[a],c=o+l,u=e.schema.path(c),!e.schema.$isRootDiscriminator||e.isSelected(c))if(!u&&k.isPOJO(r[l]))n[l]||(n[l]={}),t(e,r[l],n[l],i,c+".");else if(u){if(null===r[l])n[l]=null;else if(void 0!==r[l]){var f=r[l].$__||{},h=f.wasPopulated||null;if(u&&!h)try{n[l]=u.cast(r[l],e,!0)}catch(t){e.invalidate(t.path,new v({path:t.path,message:t.message,type:"cast",value:t.value}))}else n[l]=r[l]}e.isModified(c)||e.$__.activePaths.init(c)}else n[l]=r[l]}}(this,t,this._doc,e),
/*!
 * If populating a path within a document array, make sure each
 * subdoc within the array knows its subpaths are populated.
 *
 * ####Example:
 *     const doc = await Article.findOne().populate('comments.author');
 *     doc.comments[0].populated('author'); // Should be set
 */
function(t,e){if(null==t._id||null==e||0===e.length)return;var r=String(t._id),n=!0,i=!1,o=void 0;try{for(var s,a=e[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value;if(!u.isVirtual)for(var c=u.path,l=c.split("."),f=0;f<l.length-1;++f){var h=l.slice(0,f+1).join("."),p=l.slice(f+1).join("."),y=t.get(h);if(null!=y&&y.isMongooseDocumentArray){for(var d=0;d<y.length;++d)y[d].populated(p,null==u._docs[r]?[]:u._docs[r][d],u);break}}}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}}(this,e.populated),this.emit("init",this),this.constructor.emit("init",this),this.$__._id=this._id,this},Y.prototype.update=function(){var t=k.args(arguments);t.unshift({_id:this._id});var e=this.constructor.update.apply(this.constructor,t);return null!=this.$session()&&("session"in e.options||(e.options.session=this.$session())),e},Y.prototype.updateOne=function(t,e,r){var n=this,i=this.constructor.updateOne({_id:this._id},t,e);return i._pre(function(t){n.constructor._middleware.execPre("updateOne",n,[n],t)}),i._post(function(t){n.constructor._middleware.execPost("updateOne",n,[n],{},t)}),null!=this.$session()&&("session"in i.options||(i.options.session=this.$session())),null!=r?i.exec(r):i},Y.prototype.replaceOne=function(){var t=k.args(arguments);return t.unshift({_id:this._id}),this.constructor.replaceOne.apply(this.constructor,t)},Y.prototype.$session=function(t){if(0===arguments.length)return this.$__.session;if(this.$__.session=t,!this.ownerDocument){var e=this.$__getAllSubdocs(),r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){o.value.$session(t)}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}}return t},Y.prototype.overwrite=function(t){var e=Array.from(new Set(Object.keys(this._doc).concat(Object.keys(t)))),r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;"_id"!==a&&(this.schema.options.versionKey&&a===this.schema.options.versionKey||this.schema.options.discriminatorKey&&a===this.schema.options.discriminatorKey||this.$set(a,t[a]))}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return this},Y.prototype.$set=function(t,e,r,n){var s=this;k.isPOJO(r)&&(n=r,r=void 0);var a=(n=n||{}).merge,f=r&&!0!==r,h=!0===r,p=void 0,d=0,v=void 0,_=void 0,m=void 0,b="strict"in n?n.strict:this.$__.strictMode;if(f&&((this.$__.adhocPaths||(this.$__.adhocPaths={}))[t]=this.schema.interpretAsType(t,r,this.schema.options)),"string"!=typeof t){if(t instanceof Y&&(t=t.$__isNested?t.toObject():t._doc),null!=t){m=e?e+".":"";var w=(p=Object.keys(t)).length,O=S(n,"_skipMinimizeTopLevel",!1);if(0===w&&O)return delete n._skipMinimizeTopLevel,e&&this.$set(e,{}),this;for(;d<w;)$.call(this,d++);return this}var j=t;t=e,e=j}else this.$__.$setCalled.add(t);function $(e){_=p[e];var o=m+_;if(v=this.schema.pathType(o),!0!==r||m||null==t[_]||"nested"!==v||null==this._doc[_]||0!==Object.keys(this._doc[_]).length||(delete this._doc[_],n=Object.assign({},n,{_skipMinimizeTopLevel:!0})),"object"!==i(t[_])||k.isNativeObject(t[_])||k.isMongooseType(t[_])||null==t[_]||"virtual"===v||"real"===v||"adhocOrUndefined"===v||this.$__path(o)instanceof c||this.schema.paths[o]&&this.schema.paths[o].options&&this.schema.paths[o].options.ref)if(b){if(h&&void 0===t[_]&&void 0!==this.get(o))return;if("adhocOrUndefined"===v&&(v=E(this,o,{typeOnly:!0})),"real"===v||"virtual"===v){var s=t[_];this.schema.paths[o]&&this.schema.paths[o].$isSingleNested&&t[_]instanceof Y&&(s=s.toObject({virtuals:!1,transform:!1})),this.$set(m+_,s,h,n)}else if("nested"===v&&t[_]instanceof Y)this.$set(m+_,t[_].toObject({transform:!1}),h,n);else if("throw"===b)throw"nested"===v?new l(_,t[_]):new y(_)}else void 0!==t[_]&&this.$set(m+_,t[_],h,n);else this.$__.$setCalled.add(m+_),this.$set(t[_],m+_,h,n)}var x=this.schema.pathType(t);if("adhocOrUndefined"===x&&(x=E(this,t,{typeOnly:!0})),e=A(e),"nested"===x&&e){if("object"===(void 0===e?"undefined":i(e))&&null!=e){if(a)return this.$set(e,t,h);this.$__setValue(t,null),g(this,t);var P=Object.keys(e);this.$__setValue(t,{});var N=!0,B=!1,C=void 0;try{for(var D,M=P[Symbol.iterator]();!(N=(D=M.next()).done);N=!0){var R=D.value;this.$set(t+"."+R,e[R],h)}}catch(t){B=!0,C=t}finally{try{!N&&M.return&&M.return()}finally{if(B)throw C}}return this.markModified(t),g(this,t,{skipDocArrays:!0}),this}return this.invalidate(t,new u.CastError("Object",e,t)),this}var F=void 0,I=-1===t.indexOf(".")?[t]:t.split(".");if("string"==typeof this.schema.aliases[I[0]]&&(I[0]=this.schema.aliases[I[0]]),"adhocOrUndefined"===x&&b){var U=void 0;for(d=0;d<I.length;++d){var V=I.slice(0,d+1).join(".");if(d+1<I.length&&"virtual"===this.schema.pathType(V))return T.set(t,e,this),this;if(null!=(F=this.schema.path(V))&&F instanceof c){U=!0;break}}if(null==F&&(F=E(this,t)),!U&&!F){if("throw"===b)throw new y(t);return this}}else{if("virtual"===x)return(F=this.schema.virtualpath(t)).applySetters(e,this),this;F=this.$__path(t)}var q=this._doc,W="";for(d=0;d<I.length-1;++d)q=q[I[d]],W+=(W.length>0?".":"")+I[d],q||(this.$set(W,{}),this.isSelected(W)||this.unmarkModified(W),q=this.$__getValue(W));var H=void 0;if(I.length<=1)H=t;else{for(d=0;d<I.length;++d){var z=I.slice(0,d+1).join(".");if(null===this.get(z,null,{getters:!1})){H=z;break}}H||(H=t)}var K=null!=s.$__.$options.priorDoc?s.$__.$options.priorDoc.$__getValue(t):h?void 0:s.$__getValue(t);if(!F)return this.$__set(H,t,h,I,F,e,K),this;if((F.$isSingleNested||F.$isMongooseArray)&&
/*!
 * ignore
 */
function(t,e){if(!t.$__.validationError)return;var r=Object.keys(t.$__.validationError.errors),n=!0,i=!1,o=void 0;try{for(var s,a=r[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value;u.startsWith(e+".")&&delete t.$__.validationError.errors[u]}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}0===Object.keys(t.$__.validationError.errors).length&&(t.$__.validationError=null)}(this,t),F.$isSingleNested&&null!=e&&a){e instanceof Y&&(e=e.toObject({virtuals:!1,transform:!1}));var Q=Object.keys(e),J=!0,G=!1,X=void 0;try{for(var Z,tt=Q[Symbol.iterator]();!(J=(Z=tt.next()).done);J=!0){var et=Z.value;this.$set(t+"."+et,e[et],h,n)}}catch(t){G=!0,X=t}finally{try{!J&&tt.return&&tt.return()}finally{if(G)throw X}}return this}var rt=!0;try{var nt=function(){if(null==F.options)return!1;if(!(e instanceof Y))return!1;var t=e.constructor,r=F.options.ref;if(null!=r&&(r===t.modelName||r===t.baseModelName))return!0;var n=F.options.refPath;if(null==n)return!1;var i=e.get(n);return i===t.modelName||i===t.baseModelName}(),it=!1;nt&&e instanceof Y&&(this.populated(t,e._id,o({},L,e.constructor)),it=!0);var ot=void 0;if(F.options&&Array.isArray(F.options[this.schema.options.typeKey])&&F.options[this.schema.options.typeKey].length&&F.options[this.schema.options.typeKey][0].ref&&
/*!
 * ignore
 */
function(t,e){if(!Array.isArray(t))return!1;if(0===t.length)return!1;var r=!0,n=!1,i=void 0;try{for(var o,s=t[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;if(!(a instanceof Y))return!1;var u=a.constructor.modelName;if(null==u)return!1;if(a.constructor.modelName!=e&&a.constructor.baseModelName!=e)return!1}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return!0}(e,F.options[this.schema.options.typeKey][0].ref)&&(this.ownerDocument?(ot=o({},L,e[0].constructor),this.ownerDocument().populated(this.$__fullPath(t),e.map(function(t){return t._id}),ot)):(ot=o({},L,e[0].constructor),this.populated(t,e.map(function(t){return t._id}),ot)),it=!0),null==this.schema.singleNestedPaths[t]&&(e=F.applySetters(e,this,!1,K)),F.$isMongooseDocumentArray&&Array.isArray(e)&&e.length>0&&null!=e[0]&&null!=e[0].$__&&null!=e[0].$__.populated){var st=Object.keys(e[0].$__.populated),at=!0,ut=!1,ct=void 0;try{for(var lt,ft=function(){var r=lt.value;s.populated(t+"."+r,e.map(function(t){return t.populated(r)}),e[0].$__.populated[r].options)},ht=st[Symbol.iterator]();!(at=(lt=ht.next()).done);at=!0)ft()}catch(t){ut=!0,ct=t}finally{try{!at&&ht.return&&ht.return()}finally{if(ut)throw ct}}it=!0}if(!it&&this.$__.populated){if(Array.isArray(e)&&this.$__.populated[t])for(var pt=0;pt<e.length;++pt)e[pt]instanceof Y&&(e[pt]=e[pt]._id);delete this.$__.populated[t]}this.$markValid(t)}catch(r){r instanceof u.StrictModeError&&r.isImmutableError?this.invalidate(t,r):r instanceof u.CastError?(this.invalidate(r.path,r),r.$originalErrorPath&&this.invalidate(t,new u.CastError(F.instance,e,t,r.$originalErrorPath))):this.invalidate(t,new u.CastError(F.instance,e,t,r)),rt=!1}return rt&&this.$__set(H,t,h,I,F,e,K),F.$isSingleNested&&(this.isDirectModified(t)||null==e)&&g(this,t),this},Y.prototype.set=Y.prototype.$set,Y.prototype.$__shouldModify=function(t,e,r,n,i,o,s){return!!this.isNew||null==this.schema.singleNestedPaths[e]&&(void 0===o&&!this.isSelected(e)||!(void 0===o&&e in this.$__.activePaths.states.default)&&(!(this.populated(e)&&o instanceof Y&&C(o._id,s))&&(!C(o,s||this.get(e))||!!(!r&&null!==o&&void 0!==o&&e in this.$__.activePaths.states.default&&C(o,i.getDefault(this,r))))))},Y.prototype.$__set=function(t,e,n,i,o,s,a){W=W||r(25);var u=this;this.$__shouldModify(t,e,n,i,o,s,a)&&(this.markModified(t),q||(q=r(81)),s&&s.isMongooseArray&&(s._registerAtomic("$set",s),s.isMongooseDocumentArray&&s.forEach(function(t){t&&t.__parentArray&&(t.__parentArray=s)}),this.$__.activePaths.forEach(function(t){t.startsWith(e+".")&&u.$__.activePaths.ignore(t)})));for(var c=this._doc,l=0,f=i.length,h="";l<f;l++){var p=l+1===f;if(h+=h?"."+i[l]:i[l],H.has(i[l]))return;p?c instanceof Map?c.set(i[l],s):c[i[l]]=s:k.isPOJO(c[i[l]])?c=c[i[l]]:c[i[l]]&&c[i[l]]instanceof W?c=c[i[l]]:c[i[l]]&&c[i[l]].$isSingleNested?c=c[i[l]]:c[i[l]]&&Array.isArray(c[i[l]])?c=c[i[l]]:(c[i[l]]=c[i[l]]||{},c=c[i[l]])}},Y.prototype.$__getValue=function(t){return k.getValue(t,this._doc)},Y.prototype.$__setValue=function(t,e){return k.setValue(t,e,this._doc),this},Y.prototype.get=function(t,e,r){var n=void 0;r=r||{},e&&(n=this.schema.interpretAsType(t,e,this.schema.options));var i=this.$__path(t);if(null==i&&(i=this.schema.virtualpath(t)),i instanceof c){var o=this.schema.virtualpath(t);null!=o&&(i=o)}var s=t.split("."),a=this._doc;if(i instanceof _){if(0===i.getters.length)return;return i.applyGetters(null,this)}"string"==typeof this.schema.aliases[s[0]]&&(s[0]=this.schema.aliases[s[0]]);for(var u=0,l=s.length;u<l;u++)a&&a._doc&&(a=a._doc),a=null==a?void 0:a instanceof Map?a.get(s[u],{getters:!1}):u===l-1?k.getValue(s[u],a):a[s[u]];if(n&&(a=n.cast(a)),null!=i&&!1!==r.getters)a=i.applyGetters(a,this);else if(this.schema.nested[t]&&r.virtuals)return G(this,k.clone(a)||{},{path:t});return a},
/*!
 * ignore
 */
Y.prototype[I]=Y.prototype.get,Y.prototype.$__path=function(t){var e=this.$__.adhocPaths,r=e&&e.hasOwnProperty(t)?e[t]:null;return r||this.schema.path(t)},Y.prototype.markModified=function(t,e){this.$__.activePaths.modify(t),null==e||this.ownerDocument||(this.$__.pathsToScopes[t]=e)},Y.prototype.unmarkModified=function(t){this.$__.activePaths.init(t),delete this.$__.pathsToScopes[t]},Y.prototype.$ignore=function(t){this.$__.activePaths.ignore(t)},Y.prototype.directModifiedPaths=function(){return Object.keys(this.$__.activePaths.states.modify)},Y.prototype.$isEmpty=function(t){var e={minimize:!0,virtuals:!1,getters:!1,transform:!1};if(arguments.length>0){var r=this.get(t);return null==r||"object"===(void 0===r?"undefined":i(r))&&(k.isPOJO(r)?function t(e){if(null==e)return!0;if("object"!==(void 0===e?"undefined":i(e))||Array.isArray(e))return!1;var r=!0;var n=!1;var o=void 0;try{for(var s,a=Object.keys(e)[Symbol.iterator]();!(r=(s=a.next()).done);r=!0){var u=s.value;if(!t(e[u]))return!1}}catch(t){n=!0,o=t}finally{try{!r&&a.return&&a.return()}finally{if(n)throw o}}return!0}(r):0===Object.keys(r.toObject(e)).length)}return 0===Object.keys(this.toObject(e)).length},Y.prototype.modifiedPaths=function(t){t=t||{};var e=this;return Object.keys(this.$__.activePaths.states.modify).reduce(function(r,n){var o=n.split(".");if(r=r.concat(o.reduce(function(t,e,r){return t.concat(o.slice(0,r).concat(e).join("."))},[]).filter(function(t){return-1===r.indexOf(t)})),!t.includeChildren)return r;var s=e.get(n);if(null!=s&&"object"===(void 0===s?"undefined":i(s)))if(s._doc&&(s=s._doc),Array.isArray(s)){for(var a=s.length,u=0;u<a;++u)if(-1===r.indexOf(n+"."+u)&&(r.push(n+"."+u),null!=s[u]&&s[u].$__)){var c=s[u].modifiedPaths(),l=!0,f=!1,h=void 0;try{for(var p,y=c[Symbol.iterator]();!(l=(p=y.next()).done);l=!0){var d=p.value;r.push(n+"."+u+"."+d)}}catch(t){f=!0,h=t}finally{try{!l&&y.return&&y.return()}finally{if(f)throw h}}}}else Object.keys(s).filter(function(t){return-1===r.indexOf(n+"."+t)}).forEach(function(t){r.push(n+"."+t)});return r},[])},Y.prototype.isModified=function(t,e){if(t){Array.isArray(t)||(t=t.split(" "));var r=e||this.modifiedPaths(),n=Object.keys(this.$__.activePaths.states.modify);return t.some(function(t){return!!~r.indexOf(t)})||t.some(function(t){return n.some(function(e){return e===t||t.startsWith(e+".")})})}return this.$__.activePaths.some("modify")},Y.prototype.$isDefault=function(t){return t in this.$__.activePaths.states.default},Y.prototype.$isDeleted=function(t){return 0===arguments.length?!!this.$__.isDeleted:(this.$__.isDeleted=!!t,this)},Y.prototype.isDirectModified=function(t){return t in this.$__.activePaths.states.modify},Y.prototype.isInit=function(t){return t in this.$__.activePaths.states.init},Y.prototype.isSelected=function(t){if(this.$__.selected){if("_id"===t)return 0!==this.$__.selected._id;var e=Object.keys(this.$__.selected),r=e.length,n=null,i=void 0;if(1===r&&"_id"===e[0])return 0===this.$__.selected._id;for(;r--;)if("_id"!==(i=e[r])&&$(this.$__.selected[i])){n=!!this.$__.selected[i];break}if(null===n)return!0;if(t in this.$__.selected)return n;r=e.length;for(var o=t+".";r--;)if("_id"!==(i=e[r])){if(i.startsWith(o))return n||i!==o;if(o.startsWith(i+"."))return n}return!n}return!0},Y.prototype.isDirectSelected=function(t){if(this.$__.selected){if("_id"===t)return 0!==this.$__.selected._id;var e=Object.keys(this.$__.selected),r=e.length,n=null,i=void 0;if(1===r&&"_id"===e[0])return 0===this.$__.selected._id;for(;r--;)if("_id"!==(i=e[r])&&$(this.$__.selected[i])){n=!!this.$__.selected[i];break}return null===n||(t in this.$__.selected?n:!n)}return!0},Y.prototype.validate=function(t,e,r){var n=this,i=void 0;return this.$op="validate",null!=this.ownerDocument||(this.$__.validating?i=new h(this,{parentStack:e&&e.parentStack,conflictStack:this.$__.validating.stack}):this.$__.validating=new h(this,{parentStack:e&&e.parentStack})),"function"==typeof t?(r=t,e=null,t=null):"function"==typeof e&&(r=e,e=t,t=null),m(r,function(r){if(null!=i)return r(i);n.$__validate(t,e,function(t){n.$op=null,r(t)})},this.constructor.events)},Y.prototype.$__validate=function(t,r,n){var o=this;"function"==typeof t?(n=t,r=null,t=null):"function"==typeof r&&(n=r,r=null);var s=r&&"object"===(void 0===r?"undefined":i(r))&&"validateModifiedOnly"in r,a=void 0;a=s?!!r.validateModifiedOnly:this.schema.options.validateModifiedOnly;var c=this,l=function(){var t=o.$__.validationError;if(o.$__.validationError=void 0,a&&null!=t){var e=Object.keys(t.errors),r=!0,n=!1,i=void 0;try{for(var s,l=e[Symbol.iterator]();!(r=(s=l.next()).done);r=!0){var f=s.value;o.isModified(f)||delete t.errors[f]}}catch(t){n=!0,i=t}finally{try{!r&&l.return&&l.return()}finally{if(n)throw i}}0===Object.keys(t.errors).length&&(t=void 0)}if(o.$__.cachedRequired={},o.emit("validate",c),o.constructor.emit("validate",c),o.$__.validating=null,t){for(var h in t.errors)!o[R]&&t.errors[h]instanceof u.CastError&&o.invalidate(h,t.errors[h]);return t}},f=Q(this),h=a?f[0].filter(function(t){return o.isModified(t)}):f[0],p=f[1];if(Array.isArray(t)&&(h=J(h,t)),0===h.length)return e.nextTick(function(){var t=l();if(t)return c.schema.s.hooks.execPost("validate:error",c,[c],{error:t},function(t){n(t)});n(null,c)});for(var y={},v=0,_=function(){var t=l();if(t)return c.schema.s.hooks.execPost("validate:error",c,[c],{error:t},function(t){n(t)});n(null,c)},m=function(t){null==t||y[t]||(y[t]=!0,v++,e.nextTick(function(){var e=c.schema.path(t);if(!e)return--v||_();if(c.$isValid(t)){var r=c.$__getValue(t),n=void 0;null==r&&(n=c.populated(t))&&(r=n);var i=t in c.$__.pathsToScopes?c.$__.pathsToScopes[t]:c,o={skipSchemaValidators:p[t],path:t};e.doValidate(r,function(r){if(r&&(!e.$isMongooseDocumentArray||r.$isArrayValidatorError)){if(e.$isSingleNested&&r instanceof d&&!1===e.schema.options.storeSubdocValidationError)return--v||_();c.invalidate(t,r,void 0,!0)}--v||_()},i,o)}else--v||_()}))},g=h.length,b=0;b<g;++b)m(h[b])},Y.prototype.validateSync=function(t,e){var r=this,n=this,o=void 0;o=e&&"object"===(void 0===e?"undefined":i(e))&&"validateModifiedOnly"in e?!!e.validateModifiedOnly:this.schema.options.validateModifiedOnly,"string"==typeof t&&(t=t.split(" "));var s=Q(this),a=o?s[0].filter(function(t){return r.isModified(t)}):s[0],c=s[1];Array.isArray(t)&&(a=J(a,t));var l={};a.forEach(function(t){if(!l[t]){l[t]=!0;var e=n.schema.path(t);if(e&&n.$isValid(t)){var r=n.$__getValue(t),i=e.doValidateSync(r,n,{skipSchemaValidators:c[t],path:t});if(i&&(!e.$isMongooseDocumentArray||i.$isArrayValidatorError)){if(e.$isSingleNested&&i instanceof d&&!1===e.schema.options.storeSubdocValidationError)return;n.invalidate(t,i,void 0,!0)}}}});var f=n.$__.validationError;if(n.$__.validationError=void 0,n.emit("validate",n),n.constructor.emit("validate",n),f)for(var h in f.errors)f.errors[h]instanceof u.CastError&&n.invalidate(h,f.errors[h]);return f},Y.prototype.invalidate=function(t,e,r,n){if(this.$__.validationError||(this.$__.validationError=new d(this)),!this.$__.validationError.errors[t])return e&&"string"!=typeof e||(e=new v({path:t,message:e,type:n||"user defined",value:r})),this.$__.validationError===e?this.$__.validationError:(this.$__.validationError.addError(t,e),this.$__.validationError)},Y.prototype.$markValid=function(t){this.$__.validationError&&this.$__.validationError.errors[t]&&(delete this.$__.validationError.errors[t],0===Object.keys(this.$__.validationError.errors).length&&(this.$__.validationError=null))},Y.prototype.$isValid=function(t){return!this.$__.validationError||!this.$__.validationError.errors[t]},Y.prototype.$__reset=function(){var t=this;return V||(V=r(17)),this.$__.activePaths.map("init","modify",function(e){return t.$__getValue(e)}).filter(function(t){return t&&t instanceof Array&&t.isMongooseDocumentArray&&t.length}).forEach(function(e){for(var r=e.length;r--;){var n=e[r];n&&n.$__reset()}t.$__.activePaths.init(e.$path()),e[M]={}}),this.$__.activePaths.map("init","modify",function(e){return t.$__getValue(e)}).filter(function(t){return t&&t.$isSingleNested}).forEach(function(e){e.$__reset(),t.$__.activePaths.init(e.$basePath)}),this.$__dirty().forEach(function(t){var e=t.value;e&&e[M]&&(e[M]={})}),this.$__.activePaths.clear("modify"),this.$__.activePaths.clear("default"),this.$__.validationError=void 0,this.errors=void 0,t=this,this.schema.requiredPaths().forEach(function(e){t.$__.activePaths.require(e)}),this},Y.prototype.$__dirty=function(){var t=this,e=this.$__.activePaths.map("modify",function(e){return{path:e,value:t.$__getValue(e),schema:t.$__path(e)}});(e=e.concat(this.$__.activePaths.map("default",function(e){if("_id"!==e&&null!=t.$__getValue(e))return{path:e,value:t.$__getValue(e),schema:t.$__path(e)}}))).sort(function(t,e){return t.path<e.path?-1:t.path>e.path?1:0});var r=[],n=void 0,i=void 0;return e.forEach(function(t){t&&(null==n||0!==t.path.indexOf(n)?(n=t.path+".",r.push(t),i=t):null!=i&&null!=i.value&&null!=i.value[M]&&i.value.hasAtomics()&&(i.value[M]={},i.value[M].$set=i.value))}),i=n=null,r},Y.prototype.$__setSchema=function(t){t.plugin(j,{deduplicate:!0}),b(t.tree,this,void 0,t.options);var e=!0,r=!1,n=void 0;try{for(var i,o=Object.keys(t.virtuals)[Symbol.iterator]();!(e=(i=o.next()).done);e=!0){var s=i.value;t.virtuals[s]._applyDefaultGetters()}}catch(t){r=!0,n=t}finally{try{!e&&o.return&&o.return()}finally{if(r)throw n}}this.schema=t,this[F]=t},Y.prototype.$__getArrayPathsToValidate=function(){return V||(V=r(17)),this.$__.activePaths.map("init","modify",function(t){return this.$__getValue(t)}.bind(this)).filter(function(t){return t&&t instanceof Array&&t.isMongooseDocumentArray&&t.length}).reduce(function(t,e){return t.concat(e)},[]).filter(function(t){return t})},Y.prototype.$__getAllSubdocs=function(){V||(V=r(17)),W=W||r(25);var t=this;return Object.keys(this._doc).reduce(function(e,r){return function t(e,r,n){var i=e;return n&&(i=e instanceof Y&&e[F].paths[n]?e._doc[n]:e[n]),i instanceof W?r.push(i):i instanceof Map?r=Array.from(i.keys()).reduce(function(e,r){return t(i.get(r),e,null)},r):i&&i.$isSingleNested?(r=Object.keys(i._doc).reduce(function(e,r){return t(i._doc,e,r)},r)).push(i):i&&i.isMongooseDocumentArray?i.forEach(function(e){e&&e._doc&&(r=Object.keys(e._doc).reduce(function(r,n){return t(e._doc,r,n)},r),e instanceof W&&r.push(e))}):i instanceof Y&&i.$__isNested&&(r=Object.keys(i).reduce(function(e,r){return t(i,e,r)},r)),r}(t,e,r)},[])},Y.prototype.$__handleReject=function(t){this.listeners("error").length?this.emit("error",t):this.constructor.listeners&&this.constructor.listeners("error").length&&this.constructor.emit("error",t)},Y.prototype.$toObject=function(t,e){var r={transform:!0,flattenDecimals:!0},i=e?"toJSON":"toObject",o=S(this,"constructor.base.options."+i,{}),s=S(this,"schema.options",{});r=k.options(r,B(o)),r=k.options(r,B(s[i]||{})),"flattenMaps"in(t=k.isPOJO(t)?B(t):{})||(t.flattenMaps=r.flattenMaps);var a=void 0;a=null!=t.minimize?t.minimize:null!=r.minimize?r.minimize:s.minimize;var u=Object.assign(k.clone(t),{_isNested:!0,json:e,minimize:a});if(k.hasUserDefinedProperty(t,"getters")&&(u.getters=t.getters),k.hasUserDefinedProperty(t,"virtuals")&&(u.virtuals=t.virtuals),(t.depopulate||S(t,"_parentOptions.depopulate",!1))&&t._isNested&&this.$__.wasPopulated)return B(this._id,u);(t=k.options(r,t))._isNested=!0,t.json=e,t.minimize=a,u._parentOptions=t,u._skipSingleNestedGetters=!0;var c=Object.assign({},u);c._skipSingleNestedGetters=!1;var l=t.transform,f=B(this._doc,u)||{};t.getters&&(!function(t,e,r){var n=t.schema,i=Object.keys(n.paths),o=i.length,s=void 0,a=t._doc,u=void 0;if(!a)return e;for(;o--;){var c=(s=i[o]).split("."),l=c.length,f=l-1,h=e,p=void 0;if(a=t._doc,t.isSelected(s))for(var y=0;y<l;++y){if(p=c[y],u=a[p],y===f){var d=t.get(s);h[p]=B(d,r)}else{if(null==u){p in a&&(h[p]=u);break}h=h[p]||(h[p]={})}a=u}}}
/*!
 * Applies schema type transforms to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @return {Object} `json`
 */(this,f,c),t.minimize&&(f=
/*!
 * Minimizes an object, removing undefined values and empty objects
 *
 * @param {Object} object to minimize
 * @return {Object}
 */
function t(e){var r=Object.keys(e);var i=r.length;var o=void 0;var s=void 0;var a=void 0;for(;i--;)s=r[i],a=e[s],k.isObject(a)&&!n.isBuffer(a)&&(e[s]=t(a)),void 0!==e[s]?o=!0:delete e[s];return o?e:void 0}(f)||{})),(t.virtuals||t.getters&&!1!==t.virtuals)&&G(this,f,c,t),!1===t.versionKey&&this.schema.options.versionKey&&delete f[this.schema.options.versionKey];var h=t.transform;if(h&&function(t,e){var r=t.schema,n=Object.keys(r.paths||{});if(!t._doc)return e;var i=!0,o=!1,s=void 0;try{for(var a,u=n[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var c=a.value,l=r.paths[c];if("function"==typeof l.options.transform){var f=t.get(c);e[c]=l.options.transform.call(t,f)}else if(null!=l.$embeddedSchemaType&&"function"==typeof l.$embeddedSchemaType.options.transform){for(var h=[].concat(t.get(c)),p=l.$embeddedSchemaType.options.transform,y=0;y<h.length;++y)h[y]=p.call(t,h[y]);e[c]=h}}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}}(this,f),!0===h||s.toObject&&h){var p=t.json?s.toJSON:s.toObject;p&&(h="function"==typeof t.transform?t.transform:p.transform)}else t.transform=l;if("function"==typeof h){var y=h(this,f,t);void 0!==y&&(f=y)}return f},Y.prototype.toObject=function(t){return this.$toObject(t)},Y.prototype.toJSON=function(t){return this.$toObject(t,!0)},Y.prototype.inspect=function(t){var e=void 0;k.isPOJO(t)&&((e=t).minimize=!1);var r=this.toObject(e);return null==r?"MongooseDocument { "+r+" }":r},P.custom&&(
/*!
  * Avoid Node deprecation warning DEP0079
  */
Y.prototype[P.custom]=Y.prototype.inspect),Y.prototype.toString=function(){var t=this.inspect();return"string"==typeof t?t:P(t)},Y.prototype.equals=function(t){if(!t)return!1;var e=this.get("_id"),r=t.get?t.get("_id"):t;return e||r?e&&e.equals?e.equals(r):e===r:C(this,t)},Y.prototype.populate=function(){if(0===arguments.length)return this;var t=this.$__.populate||(this.$__.populate={}),e=k.args(arguments),r=void 0;if("function"==typeof e[e.length-1]&&(r=e.pop()),e.length){var n=k.populate.apply(null,e),i=!0,o=!1,s=void 0;try{for(var a,u=n[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var c=a.value;t[c.path]=c}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}}if(r){var l=k.object.vals(t);this.$__.populate=void 0;var f=this.constructor;if(this.$__isNested){f=this.$__[U].constructor;var h=this.$__.nestedPath;l.forEach(function(t){t.path=h+"."+t.path})}if(null!=this.$session()){var p=this.$session();l.forEach(function(t){null!=t.options?"session"in t.options||(t.options.session=p):t.options={session:p}})}f.populate(this,l,r)}return this},Y.prototype.execPopulate=function(t){var e=this;return null!=t&&"function"!=typeof t?this.populate.apply(this,arguments).execPopulate():m(t,function(t){e.populate(t)},this.constructor.events)},Y.prototype.populated=function(t,e,r){if(null===e||void 0===e){if(!this.$__.populated)return;var n=this.$__.populated[t];return n?n.value:void 0}if(!0===e){if(!this.$__.populated)return;return this.$__.populated[t]}this.$__.populated||(this.$__.populated={}),this.$__.populated[t]={value:e,options:r};for(var i=t.split("."),o=0;o<i.length-1;++o){var s=i.slice(0,o+1).join("."),a=this.get(s);if(null!=a&&null!=a.$__&&this.populated(s)){var u=i.slice(o+1).join(".");a.populated(u,e,r);break}}return e},Y.prototype.depopulate=function(t){"string"==typeof t&&(t=t.split(" "));var e=void 0,r=this.$$populatedVirtuals?Object.keys(this.$$populatedVirtuals):[],n=S(this,"$__.populated",{});if(0===arguments.length){var i=!0,o=!1,s=void 0;try{for(var a,u=r[Symbol.iterator]();!(i=(a=u.next()).done);i=!0){var c=a.value;delete this.$$populatedVirtuals[c],delete this._doc[c],delete n[c]}}catch(t){o=!0,s=t}finally{try{!i&&u.return&&u.return()}finally{if(o)throw s}}var l=Object.keys(n),f=!0,h=!1,p=void 0;try{for(var y,d=l[Symbol.iterator]();!(f=(y=d.next()).done);f=!0){var v=y.value;(e=this.populated(v))&&(delete n[v],this.$set(v,e))}}catch(t){h=!0,p=t}finally{try{!f&&d.return&&d.return()}finally{if(h)throw p}}return this}var _=!0,m=!1,g=void 0;try{for(var b,w=t[Symbol.iterator]();!(_=(b=w.next()).done);_=!0){var O=b.value;e=this.populated(O),delete n[O],-1!==r.indexOf(O)?(delete this.$$populatedVirtuals[O],delete this._doc[O]):e&&this.$set(O,e)}}catch(t){m=!0,g=t}finally{try{!_&&w.return&&w.return()}finally{if(m)throw g}}return this},Y.prototype.$__fullPath=function(t){return t||""},
/*!
 * Module exports.
 */
Y.ValidationError=d,t.exports=Y}).call(this,r(8),r(1).Buffer)},function(t,e,r){"use strict";(function(n){
/*!
 * Module dependencies.
 */
var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},o=r(4),s=r(9),a=r(48),u=r(71),c=r(5),l=r(132),f=r(50),h=r(0).schemaTypeSymbol,p=r(3),y=r(2),d=r(0).validatorErrorSymbol,v=o.CastError,_=o.ValidatorError;function m(t,e,r){this[h]=!0,this.path=t,this.instance=r,this.validators=[],this.getters=this.constructor.hasOwnProperty("getters")?this.constructor.getters.slice():[],this.setters=[],e=e||{};var n=this.constructor.defaultOptions||{},o=Object.keys(n),a=!0,u=!1,c=void 0;try{for(var f,p=o[Symbol.iterator]();!(a=(f=p.next()).done);a=!0){var d=f.value;n.hasOwnProperty(d)&&!e.hasOwnProperty(d)&&(e[d]=n[d])}}catch(t){u=!0,c=t}finally{try{!a&&p.return&&p.return()}finally{if(u)throw c}}null==e.select&&delete e.select;var v=this.OptionsConstructor||s;this.options=new v(e),this._index=null,y.hasUserDefinedProperty(this.options,"immutable")&&(this.$immutable=this.options.immutable,l(this));var _=Object.keys(this.options),m=!0,g=!1,b=void 0;try{for(var w,O=_[Symbol.iterator]();!(m=(w=O.next()).done);m=!0){var S=w.value;if("cast"!==S&&(y.hasUserDefinedProperty(this.options,S)&&"function"==typeof this[S])){if("index"===S&&this._index){if(!1===e.index){var E=this._index;if("object"===(void 0===E?"undefined":i(E))&&null!=E){if(E.unique)throw new Error('Path "'+this.path+'" may not have `index` set to false and `unique` set to true');if(E.sparse)throw new Error('Path "'+this.path+'" may not have `index` set to false and `sparse` set to true')}this._index=!1}continue}var A=e[S];if("default"===S){this.default(A);continue}var j=Array.isArray(A)?A:[A];this[S].apply(this,j)}}}catch(t){g=!0,b=t}finally{try{!m&&O.return&&O.return()}finally{if(g)throw b}}Object.defineProperty(this,"$$context",{enumerable:!1,configurable:!1,writable:!0,value:null})}
/*!
 * ignore
 */m.prototype.OptionsConstructor=s,m.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){return t}),this._cast=t,this._cast)},m.set=function(t,e){this.hasOwnProperty("defaultOptions")||(this.defaultOptions=Object.assign({},this.defaultOptions)),this.defaultOptions[t]=e},m.get=function(t){this.getters=this.hasOwnProperty("getters")?this.getters:[],this.getters.push(t)},m.prototype.default=function(t){if(1===arguments.length){if(void 0===t)return void(this.defaultValue=void 0);if(null!=t&&t.instanceOfSchema)throw new o("Cannot set default value of path `"+this.path+"` to a mongoose Schema instance.");return this.defaultValue=t,this.defaultValue}return arguments.length>1&&(this.defaultValue=y.args(arguments)),this.defaultValue},m.prototype.index=function(t){return this._index=t,y.expires(this._index),this},m.prototype.unique=function(t){if(!1===this._index){if(!t)return;throw new Error('Path "'+this.path+'" may not have `index` set to false and `unique` set to true')}return null==this._index||!0===this._index?this._index={}:"string"==typeof this._index&&(this._index={type:this._index}),this._index.unique=t,this},m.prototype.text=function(t){if(!1===this._index){if(!t)return;throw new Error('Path "'+this.path+'" may not have `index` set to false and `text` set to true')}return null===this._index||void 0===this._index||"boolean"==typeof this._index?this._index={}:"string"==typeof this._index&&(this._index={type:this._index}),this._index.text=t,this},m.prototype.sparse=function(t){if(!1===this._index){if(!t)return;throw new Error('Path "'+this.path+'" may not have `index` set to false and `sparse` set to true')}return null==this._index||"boolean"==typeof this._index?this._index={}:"string"==typeof this._index&&(this._index={type:this._index}),this._index.sparse=t,this},m.prototype.immutable=function(t){return this.$immutable=t,l(this),this},m.prototype.set=function(t){if("function"!=typeof t)throw new TypeError("A setter must be a function.");return this.setters.push(t),this},m.prototype.get=function(t){if("function"!=typeof t)throw new TypeError("A getter must be a function.");return this.getters.push(t),this},m.prototype.validate=function(t,e,r){if("function"==typeof t||t&&"RegExp"===y.getFunctionName(t.constructor)){var n=void 0;return"function"==typeof e?(n={validator:t,message:e}).type=r||"user defined":e instanceof Object&&!r?((n=y.clone(e)).message||(n.message=n.msg),n.validator=t,n.type=n.type||"user defined"):(null==e&&(e=o.messages.general.default),r||(r="user defined"),n={message:e,type:r,validator:t}),n.isAsync&&g(),this.validators.push(n),this}var s,a=void 0,u=void 0;for(a=0,s=arguments.length;a<s;a++){if(u=arguments[a],!y.isPOJO(u)){var c="Invalid validator. Received ("+(void 0===u?"undefined":i(u))+") "+u+". See http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate";throw new Error(c)}this.validate(u.validator,u)}return this};
/*!
 * ignore
 */
var g=p.deprecate(function(){},"Mongoose: the `isAsync` option for custom validators is deprecated. Make your async validators return a promise instead: https://mongoosejs.com/docs/validation.html#async-custom-validators");
/*!
 * ignore
 */
function b(t){return this.castForQuery(t)}
/*!
 * ignore
 */
/*!
 * Just like handleArray, except also allows `[]` because surprisingly
 * `$in: [1, []]` works fine
 */
function w(t){var e=this;return Array.isArray(t)?t.map(function(t){return Array.isArray(t)&&0===t.length?t:e.castForQuery(t)}):[this.castForQuery(t)]}
/*!
 * ignore
 */m.prototype.required=function(t,e){var r={};if(arguments.length>0&&null==t)return this.validators=this.validators.filter(function(t){return t.validator!==this.requiredValidator},this),this.isRequired=!1,delete this.originalRequiredValue,this;if("object"===(void 0===t?"undefined":i(t))&&(e=(r=t).message||e,t=t.isRequired),!1===t)return this.validators=this.validators.filter(function(t){return t.validator!==this.requiredValidator},this),this.isRequired=!1,delete this.originalRequiredValue,this;var n=this;this.isRequired=!0,this.requiredValidator=function(e){var r=c(this,"$__.cachedRequired");if(null!=r&&!this.isSelected(n.path)&&!this.isModified(n.path))return!0;if(null!=r&&n.path in r){var i=!r[n.path]||n.checkRequired(e,this);return delete r[n.path],i}return"function"==typeof t&&!t.apply(this)||n.checkRequired(e,this)},this.originalRequiredValue=t,"string"==typeof t&&(e=t,t=void 0);var s=e||o.messages.general.required;return this.validators.unshift(Object.assign({},r,{validator:this.requiredValidator,message:s,type:"required"})),this},m.prototype.ref=function(t){return this.options.ref=t,this},m.prototype.getDefault=function(t,e){var r="function"==typeof this.defaultValue?this.defaultValue.call(t):this.defaultValue;if(null!==r&&void 0!==r){"object"!==(void 0===r?"undefined":i(r))||this.options&&this.options.shared||(r=y.clone(r));var n=this.applySetters(r,t,e);return n&&n.$isSingleNested&&(n.$parent=t),n}return r},
/*!
 * Applies setters without casting
 *
 * @api private
 */
m.prototype._applySetters=function(t,e,r,n){var i=t,s=this.setters,a=this.caster,u=!0,c=!1,l=void 0;try{for(var f,h=y.clone(s).reverse()[Symbol.iterator]();!(u=(f=h.next()).done);u=!0){i=f.value.call(e,i,this)}}catch(t){c=!0,l=t}finally{try{!u&&h.return&&h.return()}finally{if(c)throw l}}if(Array.isArray(i)&&a&&a.setters){for(var p=[],d=0;d<i.length;++d){var v=i[d];try{p.push(a.applySetters(v,e,r,n))}catch(t){throw t instanceof o.CastError&&(t.$originalErrorPath=t.path,t.path=t.path+"."+d),t}}i=p}return i},m.prototype.applySetters=function(t,e,r,n,i){var o=this._applySetters(t,e,r,n,i);return null==o?o:o=this.cast(o,e,r,n,i)},m.prototype.applyGetters=function(t,e){var r=t,n=this.getters,i=n.length;if(0===i)return r;for(var o=0;o<i;++o)r=n[o].call(e,r,this);return r},m.prototype.select=function(t){return this.selected=!!t,this},m.prototype.doValidate=function(t,e,r,n){var o=!1,s=this.path,a=this.validators.filter(function(t){return null!=t&&"object"===(void 0===t?"undefined":i(t))}),u=a.length;if(!u)return e(null);var c=this;function l(t,r){if(!o)if(void 0===t||t)--u<=0&&f(function(){e(null)});else{var n=r.ErrorConstructor||_;(o=new n(r))[d]=!0,f(function(){e(o)})}}a.forEach(function(e){if(!o){var i=e.validator,a=void 0,u=y.clone(e);if(u.path=n&&n.path?n.path:s,u.value=t,i instanceof RegExp)l(i.test(t),u);else if("function"==typeof i)if(void 0!==t||i===c.requiredValidator)if(u.isAsync)!
/*!
 * Handle async validators
 */
function(t,e,r,n,i){var o=!1,s=t.call(e,r,function(t,e){o||(o=!0,e&&(n.message=e),i(t,n))});"boolean"==typeof s?(o=!0,i(s,n)):s&&"function"==typeof s.then&&s.then(function(t){o||(o=!0,i(t,n))},function(t){o||(o=!0,n.reason=t,n.message=t.message,i(!1,n))})}(i,r,t,u,l);else{try{a=u.propsParameter?i.call(r,t,u):i.call(r,t)}catch(t){a=!1,u.reason=t,t.message&&(u.message=t.message)}null!=a&&"function"==typeof a.then?a.then(function(t){l(t,u)},function(t){u.reason=t,u.message=t.message,l(a=!1,u)}):l(a,u)}else l(!0,u)}})},m.prototype.doValidateSync=function(t,e,r){var n=this.path;if(!this.validators.length)return null;var o=this.validators;if(void 0===t){if(!(this.validators.length>0&&"required"===this.validators[0].type))return null;o=[this.validators[0]]}var s=null;return o.forEach(function(o){if(!s&&null!=o&&"object"===(void 0===o?"undefined":i(o))){var u=o.validator,c=y.clone(o);c.path=r&&r.path?r.path:n,c.value=t;var l=void 0;if(!u.isAsync)if(u instanceof RegExp)a(u.test(t),c);else if("function"==typeof u){try{l=c.propsParameter?u.call(e,t,c):u.call(e,t)}catch(t){l=!1,c.reason=t}null!=l&&"function"==typeof l.then||a(l,c)}}}),s;function a(t,e){if(!s&&void 0!==t&&!t){var r=e.ErrorConstructor||_;(s=new r(e))[d]=!0}}},m._isRef=function(t,e,r,i){var o=i&&t.options&&(t.options.ref||t.options.refPath);if(!o&&r&&null!=r.$__){var s=r.$__fullPath(t.path);o=(r.ownerDocument?r.ownerDocument():r).populated(s)||r.populated(t.path)}if(o){if(null==e)return!0;if(!n.isBuffer(e)&&"Binary"!==e._bsontype&&y.isObject(e))return!0}return!1},m.prototype.$conditionalHandlers={$all:function(t){var e=this;return Array.isArray(t)?t.map(function(t){return e.castForQuery(t)}):[this.castForQuery(t)]},$eq:b,$in:w,$ne:b,$nin:w,$exists:a,$type:u},
/*!
 * Wraps `castForQuery` to handle context
 */
m.prototype.castForQueryWrapper=function(t){return this.$$context=t.context,"$conditional"in t?this.castForQuery(t.$conditional,t.val):t.$skipQueryCastForUpdate||t.$applySetters?this._castForQuery(t.val):this.castForQuery(t.val)},m.prototype.castForQuery=function(t,e){var r=void 0;if(2===arguments.length){if(!(r=this.$conditionalHandlers[t]))throw new Error("Can't use "+t);return r.call(this,e)}return e=t,this._castForQuery(e)},
/*!
 * Internal switch for runSetters
 *
 * @api private
 */
m.prototype._castForQuery=function(t){return this.applySetters(t,this.$$context)},m.checkRequired=function(t){return arguments.length>0&&(this._checkRequired=t),this._checkRequired},m.prototype.checkRequired=function(t){return null!=t},
/*!
 * ignore
 */
m.prototype.clone=function(){var t=Object.assign({},this.options),e=new this.constructor(this.path,t,this.instance);return e.validators=this.validators.slice(),void 0!==this.requiredValidator&&(e.requiredValidator=this.requiredValidator),void 0!==this.defaultValue&&(e.defaultValue=this.defaultValue),void 0!==this.$immutable&&void 0===this.options.immutable&&(e.$immutable=this.$immutable,l(e)),void 0!==this._index&&(e._index=this._index),void 0!==this.selected&&(e.selected=this.selected),void 0!==this.isRequired&&(e.isRequired=this.isRequired),void 0!==this.originalRequiredValue&&(e.originalRequiredValue=this.originalRequiredValue),e.getters=this.getters.slice(),e.setters=this.setters.slice(),e},
/*!
 * Module exports.
 */
t.exports=e=m,e.CastError=v,e.ValidatorError=_}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n,i,o=t.exports={};function s(){throw new Error("setTimeout has not been defined")}function a(){throw new Error("clearTimeout has not been defined")}function u(t){if(n===setTimeout)return setTimeout(t,0);if((n===s||!n)&&setTimeout)return n=setTimeout,setTimeout(t,0);try{return n(t,0)}catch(e){try{return n.call(null,t,0)}catch(e){return n.call(this,t,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:s}catch(t){n=s}try{i="function"==typeof clearTimeout?clearTimeout:a}catch(t){i=a}}();var c,l=[],f=!1,h=-1;function p(){f&&c&&(f=!1,c.length?l=c.concat(l):h=-1,l.length&&y())}function y(){if(!f){var t=u(p);f=!0;for(var e=l.length;e;){for(c=l,l=[];++h<e;)c&&c[h].run();h=-1,e=l.length}c=null,f=!1,function(t){if(i===clearTimeout)return clearTimeout(t);if((i===a||!i)&&clearTimeout)return i=clearTimeout,clearTimeout(t);try{i(t)}catch(e){try{return i.call(null,t)}catch(e){return i.call(this,t)}}}(t)}}function d(t,e){this.fun=t,this.array=e}function v(){}o.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];l.push(new d(t,e)),1!==l.length||f||u(y)},d.prototype.run=function(){this.fun.apply(null,this.array)},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=v,o.addListener=v,o.once=v,o.off=v,o.removeListener=v,o.removeAllListeners=v,o.emit=v,o.prependListener=v,o.prependOnceListener=v,o.listeners=function(t){return[]},o.binding=function(t){throw new Error("process.binding is not supported")},o.cwd=function(){return"/"},o.chdir=function(t){throw new Error("process.chdir is not supported")},o.umask=function(){return 0}},function(t,e,r){"use strict";var n=r(46),i=function t(e){if(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),null==e)return this;Object.assign(this,n(e))},o=r(10);Object.defineProperty(i.prototype,"type",o),Object.defineProperty(i.prototype,"validate",o),Object.defineProperty(i.prototype,"cast",o),Object.defineProperty(i.prototype,"required",o),Object.defineProperty(i.prototype,"default",o),Object.defineProperty(i.prototype,"ref",o),Object.defineProperty(i.prototype,"select",o),Object.defineProperty(i.prototype,"index",o),Object.defineProperty(i.prototype,"unique",o),Object.defineProperty(i.prototype,"immutable",o),Object.defineProperty(i.prototype,"sparse",o),Object.defineProperty(i.prototype,"text",o),Object.defineProperty(i.prototype,"transform",o),t.exports=i},function(t,e,r){"use strict";t.exports=Object.freeze({enumerable:!0,configurable:!0,writable:!0,value:void 0})},function(t,e,r){"use strict";var n,i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(t){"object"===("undefined"==typeof window?"undefined":i(window))&&(n=window)}t.exports=n},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}();function i(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}var o=r(16),s=r(5),a=r(3),u=function(t){function e(t,r,n,o,s){if(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),arguments.length>0){var a=f(null,t,c(r),n,l(s));(u=i(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,a))).init(t,r,n,o,s)}else var u=i(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,f()));return i(u)}
/*!
   * ignore
   */return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,o),n(e,[{key:"init",value:function(t,e,r,n,i){this.stringValue=c(e),this.messageFormat=l(i),this.kind=t,this.value=e,this.path=r,this.reason=n}
/*!
     * ignore
     * @param {Readonly<CastError>} other
     */},{key:"copy",value:function(t){this.messageFormat=t.messageFormat,this.stringValue=t.stringValue,this.kind=t.kind,this.value=t.value,this.path=t.path,this.reason=t.reason,this.message=t.message}
/*!
     * ignore
     */},{key:"setModel",value:function(t){this.model=t,this.message=f(t,this.kind,this.stringValue,this.path,this.messageFormat)}}]),e}();function c(t){var e=a.inspect(t);return(e=e.replace(/^'|'$/g,'"')).startsWith('"')||(e='"'+e+'"'),e}function l(t){var e=s(t,"options.cast",null);if("string"==typeof e)return e}
/*!
 * ignore
 */function f(t,e,r,n,i){if(null!=i){var o=i.replace("{KIND}",e).replace("{VALUE}",r).replace("{PATH}",n);return null!=t&&(o=o.replace("{MODEL}",t.modelName)),o}var s="Cast to "+e+" failed for value "+r+' at path "'+n+'"';return null!=t&&(s+=' for model "'+t.modelName+'"'),s}
/*!
 * exports
 */Object.defineProperty(u.prototype,"name",{value:"CastError"}),t.exports=u},function(t,e,r){"use strict";var n=r(14).get().ObjectId,i=r(0).objectIdSymbol;
/*!
 * Getter for convenience with populate, see gh-6115
 */
Object.defineProperty(n.prototype,"_id",{enumerable:!1,configurable:!0,get:function(){return this}}),n.prototype[i]=!0,t.exports=n},function(t,e,r){"use strict";
/*!
 * ignore
 */var n=null;t.exports.get=function(){return n},t.exports.set=function(t){n=t}},function(t,e,r){"use strict";(function(e){function r(t,r){return new e(t,r)}t.exports={normalizedFunctionString:function(t){return t.toString().replace(/function *\(/,"function (")},allocBuffer:"function"==typeof e.alloc?function(){return e.alloc.apply(e,arguments)}:r,toBuffer:"function"==typeof e.from?function(){return e.from.apply(e,arguments)}:r}}).call(this,r(1).Buffer)},function(t,e,r){"use strict";
/*!
 * ignore
 */var n=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,Error),e}();Object.defineProperty(n.prototype,"name",{value:"MongooseError"}),t.exports=n},function(t,e,r){"use strict";(function(e){
/*!
 * Module dependencies.
 */
var n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),i=function t(e,r,n){null===e&&(e=Function.prototype);var i=Object.getOwnPropertyDescriptor(e,r);if(void 0===i){var o=Object.getPrototypeOf(e);return null===o?void 0:t(o,r,n)}if("value"in i)return i.value;var s=i.get;return void 0!==s?s.call(n):void 0};var o=r(82),s=r(6),a=r(13),u=r(85),c=r(56),l=r(22).internalToObjectOptions,f=r(3),h=r(2),p=r(0).arrayAtomicsSymbol,y=r(0).arrayParentSymbol,d=r(0).arrayPathSymbol,v=r(0).arraySchemaSymbol,_=r(0).documentArrayParent,m=Array.prototype.push,g=function(t){function r(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,r),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(r.__proto__||Object.getPrototypeOf(r)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(r,o),n(r,[{key:"toBSON",
/*!
     * ignore
     */
value:function(){return this.toObject(l)}
/*!
     * ignore
     */},{key:"map",value:function(){var t=i(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"map",this).apply(this,arguments);return t[v]=null,t[d]=null,t[y]=null,t}},{key:"_cast",value:function(t,r){if(null==this[v])return t;var n=this[v].casterConstructor;if((n.$isMongooseDocumentArray?t&&t.isMongooseDocumentArray:t instanceof n)||t&&t.constructor&&t.constructor.baseCasterConstructor===n)return t[_]&&t.__parentArray||(t[_]=this[y],t.__parentArray=this),t.$setIndex(r),t;if(void 0===t||null===t)return null;if((e.isBuffer(t)||t instanceof a||!h.isObject(t))&&(t={_id:t}),t&&n.discriminators&&n.schema&&n.schema.options&&n.schema.options.discriminatorKey)if("string"==typeof t[n.schema.options.discriminatorKey]&&n.discriminators[t[n.schema.options.discriminatorKey]])n=n.discriminators[t[n.schema.options.discriminatorKey]];else{var i=c(n,t[n.schema.options.discriminatorKey]);i&&(n=i)}return n.$isMongooseDocumentArray?n.cast(t,this,void 0,void 0,r):new n(t,this,void 0,void 0,r)}},{key:"id",value:function(t){var e=void 0,r=void 0,n=void 0;try{e=u(t).toString()}catch(t){e=null}var i=!0,o=!1,c=void 0;try{for(var l,f=this[Symbol.iterator]();!(i=(l=f.next()).done);i=!0){var p=l.value;if(p&&(null!==(n=p.get("_id"))&&void 0!==n))if(n instanceof s){if(r||(r=String(t)),r==n._id)return p}else if(t instanceof a||n instanceof a){if(e==n)return p}else if(h.deepEqual(t,n))return p}}catch(t){o=!0,c=t}finally{try{!i&&f.return&&f.return()}finally{if(o)throw c}}return null}},{key:"toObject",value:function(t){return[].concat(this.map(function(e){return null==e?null:"function"!=typeof e.toObject?e:e.toObject(t)}))}},{key:"slice",value:function(){var t=i(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"slice",this).apply(this,arguments);return t[y]=this[y],t[d]=this[d],t}},{key:"push",value:function(){var t=i(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"push",this).apply(this,arguments);return b(this),t}},{key:"pull",value:function(){var t=i(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"pull",this).apply(this,arguments);return b(this),t}},{key:"shift",value:function(){var t=i(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"shift",this).apply(this,arguments);return b(this),t}},{key:"splice",value:function(){var t=i(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"splice",this).apply(this,arguments);return b(this),t}},{key:"inspect",value:function(){return this.toObject()}},{key:"create",value:function(t){var e=this[v].casterConstructor;if(t&&e.discriminators&&e.schema&&e.schema.options&&e.schema.options.discriminatorKey)if("string"==typeof t[e.schema.options.discriminatorKey]&&e.discriminators[t[e.schema.options.discriminatorKey]])e=e.discriminators[t[e.schema.options.discriminatorKey]];else{var r=c(e,t[e.schema.options.discriminatorKey]);r&&(e=r)}return new e(t,this)}
/*!
     * ignore
     */},{key:"notify",value:function(t){var e=this;return function r(n,i){for(var o=(i=i||e).length;o--;)if(null!=i[o]){switch(t){case"save":n=e[o]}i[o].isMongooseArray?r(n,i[o]):i[o]&&i[o].emit(t,n)}}}},{key:"isMongooseDocumentArray",get:function(){return!0}}]),r}();
/*!
 * If this is a document array, each element may contain single
 * populated paths, so we need to modify the top-level document's
 * populated cache. See gh-8247, gh-8265.
 */
function b(t){var e=t[y];if(e&&null!=e.$__.populated){var r=Object.keys(e.$__.populated).filter(function(e){return e.startsWith(t[d]+".")}),n=!0,i=!1,o=void 0;try{for(var s,a=function(){var r=s.value,n=r.slice((t[d]+".").length);if(!Array.isArray(e.$__.populated[r].value))return"continue";e.$__.populated[r].value=t.map(function(t){return t.populated(n)})},u=r[Symbol.iterator]();!(n=(s=u.next()).done);n=!0)a()}catch(t){i=!0,o=t}finally{try{!n&&u.return&&u.return()}finally{if(i)throw o}}}}f.inspect.custom&&(g.prototype[f.inspect.custom]=g.prototype.inspect),
/*!
 * Module exports.
 */
t.exports=function(t,e,r){var n=new g;if(n[p]={},n[v]=void 0,Array.isArray(t)&&(t instanceof g&&t[d]===e&&t[y]===r&&(n[p]=Object.assign({},t[p])),t.forEach(function(t){m.call(n,t)})),n[d]=e,r&&r instanceof s)for(n[y]=r,n[v]=r.schema.path(e);null!=n&&null!=n[v]&&n[v].$isMongooseArray&&!n[v].$isMongooseDocumentArray;)n[v]=n[v].casterConstructor;return n}}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n,i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},o="object"===("undefined"==typeof Reflect?"undefined":i(Reflect))?Reflect:null,s=o&&"function"==typeof o.apply?o.apply:function(t,e,r){return Function.prototype.apply.call(t,e,r)};n=o&&"function"==typeof o.ownKeys?o.ownKeys:Object.getOwnPropertySymbols?function(t){return Object.getOwnPropertyNames(t).concat(Object.getOwnPropertySymbols(t))}:function(t){return Object.getOwnPropertyNames(t)};var a=Number.isNaN||function(t){return t!=t};function u(){u.init.call(this)}t.exports=u,u.EventEmitter=u,u.prototype._events=void 0,u.prototype._eventsCount=0,u.prototype._maxListeners=void 0;var c=10;function l(t){if("function"!=typeof t)throw new TypeError('The "listener" argument must be of type Function. Received type '+(void 0===t?"undefined":i(t)))}function f(t){return void 0===t._maxListeners?u.defaultMaxListeners:t._maxListeners}function h(t,e,r,n){var i,o,s;if(l(r),void 0===(o=t._events)?(o=t._events=Object.create(null),t._eventsCount=0):(void 0!==o.newListener&&(t.emit("newListener",e,r.listener?r.listener:r),o=t._events),s=o[e]),void 0===s)s=o[e]=r,++t._eventsCount;else if("function"==typeof s?s=o[e]=n?[r,s]:[s,r]:n?s.unshift(r):s.push(r),(i=f(t))>0&&s.length>i&&!s.warned){s.warned=!0;var a=new Error("Possible EventEmitter memory leak detected. "+s.length+" "+String(e)+" listeners added. Use emitter.setMaxListeners() to increase limit");a.name="MaxListenersExceededWarning",a.emitter=t,a.type=e,a.count=s.length,function(t){console&&console.warn&&console.warn(t)}(a)}return t}function p(t,e,r){var n={fired:!1,wrapFn:void 0,target:t,type:e,listener:r},i=function(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}.bind(n);return i.listener=r,n.wrapFn=i,i}function y(t,e,r){var n=t._events;if(void 0===n)return[];var i=n[e];return void 0===i?[]:"function"==typeof i?r?[i.listener||i]:[i]:r?function(t){for(var e=new Array(t.length),r=0;r<e.length;++r)e[r]=t[r].listener||t[r];return e}(i):v(i,i.length)}function d(t){var e=this._events;if(void 0!==e){var r=e[t];if("function"==typeof r)return 1;if(void 0!==r)return r.length}return 0}function v(t,e){for(var r=new Array(e),n=0;n<e;++n)r[n]=t[n];return r}Object.defineProperty(u,"defaultMaxListeners",{enumerable:!0,get:function(){return c},set:function(t){if("number"!=typeof t||t<0||a(t))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+t+".");c=t}}),u.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},u.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||a(t))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+t+".");return this._maxListeners=t,this},u.prototype.getMaxListeners=function(){return f(this)},u.prototype.emit=function(t){for(var e=[],r=1;r<arguments.length;r++)e.push(arguments[r]);var n="error"===t,i=this._events;if(void 0!==i)n=n&&void 0===i.error;else if(!n)return!1;if(n){var o;if(e.length>0&&(o=e[0]),o instanceof Error)throw o;var a=new Error("Unhandled error."+(o?" ("+o.message+")":""));throw a.context=o,a}var u=i[t];if(void 0===u)return!1;if("function"==typeof u)s(u,this,e);else{var c=u.length,l=v(u,c);for(r=0;r<c;++r)s(l[r],this,e)}return!0},u.prototype.addListener=function(t,e){return h(this,t,e,!1)},u.prototype.on=u.prototype.addListener,u.prototype.prependListener=function(t,e){return h(this,t,e,!0)},u.prototype.once=function(t,e){return l(e),this.on(t,p(this,t,e)),this},u.prototype.prependOnceListener=function(t,e){return l(e),this.prependListener(t,p(this,t,e)),this},u.prototype.removeListener=function(t,e){var r,n,i,o,s;if(l(e),void 0===(n=this._events))return this;if(void 0===(r=n[t]))return this;if(r===e||r.listener===e)0==--this._eventsCount?this._events=Object.create(null):(delete n[t],n.removeListener&&this.emit("removeListener",t,r.listener||e));else if("function"!=typeof r){for(i=-1,o=r.length-1;o>=0;o--)if(r[o]===e||r[o].listener===e){s=r[o].listener,i=o;break}if(i<0)return this;0===i?r.shift():function(t,e){for(;e+1<t.length;e++)t[e]=t[e+1];t.pop()}(r,i),1===r.length&&(n[t]=r[0]),void 0!==n.removeListener&&this.emit("removeListener",t,s||e)}return this},u.prototype.off=u.prototype.removeListener,u.prototype.removeAllListeners=function(t){var e,r,n;if(void 0===(r=this._events))return this;if(void 0===r.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==r[t]&&(0==--this._eventsCount?this._events=Object.create(null):delete r[t]),this;if(0===arguments.length){var i,o=Object.keys(r);for(n=0;n<o.length;++n)"removeListener"!==(i=o[n])&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"==typeof(e=r[t]))this.removeListener(t,e);else if(void 0!==e)for(n=e.length-1;n>=0;n--)this.removeListener(t,e[n]);return this},u.prototype.listeners=function(t){return y(this,t,!0)},u.prototype.rawListeners=function(t){return y(this,t,!1)},u.listenerCount=function(t,e){return"function"==typeof t.listenerCount?t.listenerCount(e):d.call(t,e)},u.prototype.listenerCount=d,u.prototype.eventNames=function(){return this._eventsCount>0?n(this._events):[]}},function(t,e,r){"use strict";t.exports=r(14).get().Decimal128},function(t,e,r){"use strict";(function(e){
/*!
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */
t.exports=function(t){return!!e.isBuffer(t)||"[object Object]"===Object.prototype.toString.call(t)}}).call(this,r(1).Buffer)},function(t,e,r){"use strict";(function(e){var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(114);
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function o(t,e){if(t===e)return 0;for(var r=t.length,n=e.length,i=0,o=Math.min(r,n);i<o;++i)if(t[i]!==e[i]){r=t[i],n=e[i];break}return r<n?-1:n<r?1:0}function s(t){return e.Buffer&&"function"==typeof e.Buffer.isBuffer?e.Buffer.isBuffer(t):!(null==t||!t._isBuffer)}var a=r(3),u=Object.prototype.hasOwnProperty,c=Array.prototype.slice,l="foo"===function(){}.name;function f(t){return Object.prototype.toString.call(t)}function h(t){return!s(t)&&("function"==typeof e.ArrayBuffer&&("function"==typeof ArrayBuffer.isView?ArrayBuffer.isView(t):!!t&&(t instanceof DataView||!!(t.buffer&&t.buffer instanceof ArrayBuffer))))}var p=t.exports=g,y=/\s*function\s+([^\(\s]*)\s*/;function d(t){if(a.isFunction(t)){if(l)return t.name;var e=t.toString().match(y);return e&&e[1]}}function v(t,e){return"string"==typeof t?t.length<e?t:t.slice(0,e):t}function _(t){if(l||!a.isFunction(t))return a.inspect(t);var e=d(t);return"[Function"+(e?": "+e:"")+"]"}function m(t,e,r,n,i){throw new p.AssertionError({message:r,actual:t,expected:e,operator:n,stackStartFunction:i})}function g(t,e){t||m(t,!0,e,"==",p.ok)}function b(t,e,r,i){if(t===e)return!0;if(s(t)&&s(e))return 0===o(t,e);if(a.isDate(t)&&a.isDate(e))return t.getTime()===e.getTime();if(a.isRegExp(t)&&a.isRegExp(e))return t.source===e.source&&t.global===e.global&&t.multiline===e.multiline&&t.lastIndex===e.lastIndex&&t.ignoreCase===e.ignoreCase;if(null!==t&&"object"===(void 0===t?"undefined":n(t))||null!==e&&"object"===(void 0===e?"undefined":n(e))){if(h(t)&&h(e)&&f(t)===f(e)&&!(t instanceof Float32Array||t instanceof Float64Array))return 0===o(new Uint8Array(t.buffer),new Uint8Array(e.buffer));if(s(t)!==s(e))return!1;var u=(i=i||{actual:[],expected:[]}).actual.indexOf(t);return-1!==u&&u===i.expected.indexOf(e)||(i.actual.push(t),i.expected.push(e),function(t,e,r,n){if(null===t||void 0===t||null===e||void 0===e)return!1;if(a.isPrimitive(t)||a.isPrimitive(e))return t===e;if(r&&Object.getPrototypeOf(t)!==Object.getPrototypeOf(e))return!1;var i=w(t),o=w(e);if(i&&!o||!i&&o)return!1;if(i)return t=c.call(t),e=c.call(e),b(t,e,r);var s,u,l=E(t),f=E(e);if(l.length!==f.length)return!1;for(l.sort(),f.sort(),u=l.length-1;u>=0;u--)if(l[u]!==f[u])return!1;for(u=l.length-1;u>=0;u--)if(s=l[u],!b(t[s],e[s],r,n))return!1;return!0}(t,e,r,i))}return r?t===e:t==e}function w(t){return"[object Arguments]"==Object.prototype.toString.call(t)}function O(t,e){if(!t||!e)return!1;if("[object RegExp]"==Object.prototype.toString.call(e))return e.test(t);try{if(t instanceof e)return!0}catch(t){}return!Error.isPrototypeOf(e)&&!0===e.call({},t)}function S(t,e,r,n){var i;if("function"!=typeof e)throw new TypeError('"block" argument must be a function');"string"==typeof r&&(n=r,r=null),i=function(t){var e;try{t()}catch(t){e=t}return e}(e),n=(r&&r.name?" ("+r.name+").":".")+(n?" "+n:"."),t&&!i&&m(i,r,"Missing expected exception"+n);var o="string"==typeof n,s=!t&&a.isError(i),u=!t&&i&&!r;if((s&&o&&O(i,r)||u)&&m(i,r,"Got unwanted exception"+n),t&&i&&r&&!O(i,r)||!t&&i)throw i}p.AssertionError=function(t){this.name="AssertionError",this.actual=t.actual,this.expected=t.expected,this.operator=t.operator,t.message?(this.message=t.message,this.generatedMessage=!1):(this.message=function(t){return v(_(t.actual),128)+" "+t.operator+" "+v(_(t.expected),128)}(this),this.generatedMessage=!0);var e=t.stackStartFunction||m;if(Error.captureStackTrace)Error.captureStackTrace(this,e);else{var r=new Error;if(r.stack){var n=r.stack,i=d(e),o=n.indexOf("\n"+i);if(o>=0){var s=n.indexOf("\n",o+1);n=n.substring(s+1)}this.stack=n}}},a.inherits(p.AssertionError,Error),p.fail=m,p.ok=g,p.equal=function(t,e,r){t!=e&&m(t,e,r,"==",p.equal)},p.notEqual=function(t,e,r){t==e&&m(t,e,r,"!=",p.notEqual)},p.deepEqual=function(t,e,r){b(t,e,!1)||m(t,e,r,"deepEqual",p.deepEqual)},p.deepStrictEqual=function(t,e,r){b(t,e,!0)||m(t,e,r,"deepStrictEqual",p.deepStrictEqual)},p.notDeepEqual=function(t,e,r){b(t,e,!1)&&m(t,e,r,"notDeepEqual",p.notDeepEqual)},p.notDeepStrictEqual=function t(e,r,n){b(e,r,!0)&&m(e,r,n,"notDeepStrictEqual",t)},p.strictEqual=function(t,e,r){t!==e&&m(t,e,r,"===",p.strictEqual)},p.notStrictEqual=function(t,e,r){t===e&&m(t,e,r,"!==",p.notStrictEqual)},p.throws=function(t,e,r){S(!0,t,e,r)},p.doesNotThrow=function(t,e,r){S(!1,t,e,r)},p.ifError=function(t){if(t)throw t},p.strict=i(function t(e,r){e||m(e,!0,r,"==",t)},p,{equal:p.strictEqual,deepEqual:p.deepStrictEqual,notEqual:p.notStrictEqual,notDeepEqual:p.notDeepStrictEqual}),p.strict.strict=p.strict;var E=Object.keys||function(t){var e=[];for(var r in t)u.call(t,r)&&e.push(r);return e}}).call(this,r(11))},function(t,e,r){"use strict";
/*!
 * ignore
 */e.internalToObjectOptions={transform:!1,virtuals:!1,getters:!1,_skipDepopulateTopLevel:!0,depopulate:!0,flattenDecimals:!1}},function(t,e,r){"use strict";function n(t,e){if(!(this instanceof n))return new n(t,e);this._bsontype="Long",this.low_=0|t,this.high_=0|e}n.prototype.toInt=function(){return this.low_},n.prototype.toNumber=function(){return this.high_*n.TWO_PWR_32_DBL_+this.getLowBitsUnsigned()},n.prototype.toJSON=function(){return this.toString()},n.prototype.toString=function(t){var e=t||10;if(e<2||36<e)throw Error("radix out of range: "+e);if(this.isZero())return"0";if(this.isNegative()){if(this.equals(n.MIN_VALUE)){var r=n.fromNumber(e),i=this.div(r),o=i.multiply(r).subtract(this);return i.toString(e)+o.toInt().toString(e)}return"-"+this.negate().toString(e)}var s=n.fromNumber(Math.pow(e,6));o=this;for(var a="";!o.isZero();){var u=o.div(s),c=o.subtract(u.multiply(s)).toInt().toString(e);if((o=u).isZero())return c+a;for(;c.length<6;)c="0"+c;a=""+c+a}},n.prototype.getHighBits=function(){return this.high_},n.prototype.getLowBits=function(){return this.low_},n.prototype.getLowBitsUnsigned=function(){return this.low_>=0?this.low_:n.TWO_PWR_32_DBL_+this.low_},n.prototype.getNumBitsAbs=function(){if(this.isNegative())return this.equals(n.MIN_VALUE)?64:this.negate().getNumBitsAbs();for(var t=0!==this.high_?this.high_:this.low_,e=31;e>0&&0==(t&1<<e);e--);return 0!==this.high_?e+33:e+1},n.prototype.isZero=function(){return 0===this.high_&&0===this.low_},n.prototype.isNegative=function(){return this.high_<0},n.prototype.isOdd=function(){return 1==(1&this.low_)},n.prototype.equals=function(t){return this.high_===t.high_&&this.low_===t.low_},n.prototype.notEquals=function(t){return this.high_!==t.high_||this.low_!==t.low_},n.prototype.lessThan=function(t){return this.compare(t)<0},n.prototype.lessThanOrEqual=function(t){return this.compare(t)<=0},n.prototype.greaterThan=function(t){return this.compare(t)>0},n.prototype.greaterThanOrEqual=function(t){return this.compare(t)>=0},n.prototype.compare=function(t){if(this.equals(t))return 0;var e=this.isNegative(),r=t.isNegative();return e&&!r?-1:!e&&r?1:this.subtract(t).isNegative()?-1:1},n.prototype.negate=function(){return this.equals(n.MIN_VALUE)?n.MIN_VALUE:this.not().add(n.ONE)},n.prototype.add=function(t){var e=this.high_>>>16,r=65535&this.high_,i=this.low_>>>16,o=65535&this.low_,s=t.high_>>>16,a=65535&t.high_,u=t.low_>>>16,c=0,l=0,f=0,h=0;return f+=(h+=o+(65535&t.low_))>>>16,h&=65535,l+=(f+=i+u)>>>16,f&=65535,c+=(l+=r+a)>>>16,l&=65535,c+=e+s,c&=65535,n.fromBits(f<<16|h,c<<16|l)},n.prototype.subtract=function(t){return this.add(t.negate())},n.prototype.multiply=function(t){if(this.isZero())return n.ZERO;if(t.isZero())return n.ZERO;if(this.equals(n.MIN_VALUE))return t.isOdd()?n.MIN_VALUE:n.ZERO;if(t.equals(n.MIN_VALUE))return this.isOdd()?n.MIN_VALUE:n.ZERO;if(this.isNegative())return t.isNegative()?this.negate().multiply(t.negate()):this.negate().multiply(t).negate();if(t.isNegative())return this.multiply(t.negate()).negate();if(this.lessThan(n.TWO_PWR_24_)&&t.lessThan(n.TWO_PWR_24_))return n.fromNumber(this.toNumber()*t.toNumber());var e=this.high_>>>16,r=65535&this.high_,i=this.low_>>>16,o=65535&this.low_,s=t.high_>>>16,a=65535&t.high_,u=t.low_>>>16,c=65535&t.low_,l=0,f=0,h=0,p=0;return h+=(p+=o*c)>>>16,p&=65535,f+=(h+=i*c)>>>16,h&=65535,f+=(h+=o*u)>>>16,h&=65535,l+=(f+=r*c)>>>16,f&=65535,l+=(f+=i*u)>>>16,f&=65535,l+=(f+=o*a)>>>16,f&=65535,l+=e*c+r*u+i*a+o*s,l&=65535,n.fromBits(h<<16|p,l<<16|f)},n.prototype.div=function(t){if(t.isZero())throw Error("division by zero");if(this.isZero())return n.ZERO;if(this.equals(n.MIN_VALUE)){if(t.equals(n.ONE)||t.equals(n.NEG_ONE))return n.MIN_VALUE;if(t.equals(n.MIN_VALUE))return n.ONE;var e=this.shiftRight(1).div(t).shiftLeft(1);if(e.equals(n.ZERO))return t.isNegative()?n.ONE:n.NEG_ONE;var r=this.subtract(t.multiply(e));return e.add(r.div(t))}if(t.equals(n.MIN_VALUE))return n.ZERO;if(this.isNegative())return t.isNegative()?this.negate().div(t.negate()):this.negate().div(t).negate();if(t.isNegative())return this.div(t.negate()).negate();var i=n.ZERO;for(r=this;r.greaterThanOrEqual(t);){e=Math.max(1,Math.floor(r.toNumber()/t.toNumber()));for(var o=Math.ceil(Math.log(e)/Math.LN2),s=o<=48?1:Math.pow(2,o-48),a=n.fromNumber(e),u=a.multiply(t);u.isNegative()||u.greaterThan(r);)e-=s,u=(a=n.fromNumber(e)).multiply(t);a.isZero()&&(a=n.ONE),i=i.add(a),r=r.subtract(u)}return i},n.prototype.modulo=function(t){return this.subtract(this.div(t).multiply(t))},n.prototype.not=function(){return n.fromBits(~this.low_,~this.high_)},n.prototype.and=function(t){return n.fromBits(this.low_&t.low_,this.high_&t.high_)},n.prototype.or=function(t){return n.fromBits(this.low_|t.low_,this.high_|t.high_)},n.prototype.xor=function(t){return n.fromBits(this.low_^t.low_,this.high_^t.high_)},n.prototype.shiftLeft=function(t){if(0===(t&=63))return this;var e=this.low_;if(t<32){var r=this.high_;return n.fromBits(e<<t,r<<t|e>>>32-t)}return n.fromBits(0,e<<t-32)},n.prototype.shiftRight=function(t){if(0===(t&=63))return this;var e=this.high_;if(t<32){var r=this.low_;return n.fromBits(r>>>t|e<<32-t,e>>t)}return n.fromBits(e>>t-32,e>=0?0:-1)},n.prototype.shiftRightUnsigned=function(t){if(0===(t&=63))return this;var e=this.high_;if(t<32){var r=this.low_;return n.fromBits(r>>>t|e<<32-t,e>>>t)}return 32===t?n.fromBits(e,0):n.fromBits(e>>>t-32,0)},n.fromInt=function(t){if(-128<=t&&t<128){var e=n.INT_CACHE_[t];if(e)return e}var r=new n(0|t,t<0?-1:0);return-128<=t&&t<128&&(n.INT_CACHE_[t]=r),r},n.fromNumber=function(t){return isNaN(t)||!isFinite(t)?n.ZERO:t<=-n.TWO_PWR_63_DBL_?n.MIN_VALUE:t+1>=n.TWO_PWR_63_DBL_?n.MAX_VALUE:t<0?n.fromNumber(-t).negate():new n(t%n.TWO_PWR_32_DBL_|0,t/n.TWO_PWR_32_DBL_|0)},n.fromBits=function(t,e){return new n(t,e)},n.fromString=function(t,e){if(0===t.length)throw Error("number format error: empty string");var r=e||10;if(r<2||36<r)throw Error("radix out of range: "+r);if("-"===t.charAt(0))return n.fromString(t.substring(1),r).negate();if(t.indexOf("-")>=0)throw Error('number format error: interior "-" character: '+t);for(var i=n.fromNumber(Math.pow(r,8)),o=n.ZERO,s=0;s<t.length;s+=8){var a=Math.min(8,t.length-s),u=parseInt(t.substring(s,s+a),r);if(a<8){var c=n.fromNumber(Math.pow(r,a));o=o.multiply(c).add(n.fromNumber(u))}else o=(o=o.multiply(i)).add(n.fromNumber(u))}return o},n.INT_CACHE_={},n.TWO_PWR_16_DBL_=65536,n.TWO_PWR_24_DBL_=1<<24,n.TWO_PWR_32_DBL_=n.TWO_PWR_16_DBL_*n.TWO_PWR_16_DBL_,n.TWO_PWR_31_DBL_=n.TWO_PWR_32_DBL_/2,n.TWO_PWR_48_DBL_=n.TWO_PWR_32_DBL_*n.TWO_PWR_16_DBL_,n.TWO_PWR_64_DBL_=n.TWO_PWR_32_DBL_*n.TWO_PWR_32_DBL_,n.TWO_PWR_63_DBL_=n.TWO_PWR_64_DBL_/2,n.ZERO=n.fromInt(0),n.ONE=n.fromInt(1),n.NEG_ONE=n.fromInt(-1),n.MAX_VALUE=n.fromBits(-1,2147483647),n.MIN_VALUE=n.fromBits(0,-2147483648),n.TWO_PWR_24_=n.fromInt(1<<24),t.exports=n,t.exports.Long=n},function(t,e,r){"use strict";(function(e){var n=r(66),i=Symbol.for("mongoose:emitted");t.exports=function(t,r,o){return"function"==typeof t?r(function(r){if(null==r)t.apply(this,arguments);else{null!=o&&o.listeners("error").length>0&&!r[i]&&(r[i]=!0,o.emit("error",r));try{t(r)}catch(r){return e.nextTick(function(){throw r})}}}):new(n.get())(function(t,e){r(function(r,n){return null!=r?(null!=o&&o.listeners("error").length>0&&!r[i]&&(r[i]=!0,o.emit("error",r)),e(r)):arguments.length>2?t(Array.prototype.slice.call(arguments,1)):void t(n)})})}}).call(this,r(8))},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(61)(),i=r(18).EventEmitter,o=r(29),s=r(50),a=r(22).internalToObjectOptions,u=r(5),c=r(24),l=r(3),f=r(0).documentArrayParent,h=r(0).validatorErrorSymbol;function p(t,e,r,i,o){null!=e&&e.isMongooseDocumentArray?(this.__parentArray=e,this[f]=e.$parent()):(this.__parentArray=void 0,this[f]=void 0),this.$setIndex(o),this.$isDocumentArrayElement=!0,n.call(this,t,i,r);var s=this;this.on("isNew",function(t){s.isNew=t}),s.on("save",function(){s.constructor.emit("save",s)})}
/*!
 * Inherit from Document
 */for(var y in p.prototype=Object.create(n.prototype),p.prototype.constructor=p,i.prototype)p[y]=i.prototype[y];p.prototype.toBSON=function(){return this.toObject(a)},
/*!
 * ignore
 */
p.prototype.$setIndex=function(t){if(this.__index=t,null!=u(this,"$__.validationError",null)){var e=Object.keys(this.$__.validationError.errors),r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;this.invalidate(a,this.$__.validationError.errors[a])}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}}},p.prototype.markModified=function(t){this.$__.activePaths.modify(t),this.__parentArray&&(this.isNew?this.__parentArray._markModified():this.__parentArray._markModified(this,t))},
/*!
 * ignore
 */
p.prototype.populate=function(){throw new Error('Mongoose does not support calling populate() on nested docs. Instead of `doc.arr[0].populate("path")`, use `doc.populate("arr.0.path")`')},p.prototype.save=function(t,e){var r=this;return"function"==typeof t&&(e=t,t={}),(t=t||{}).suppressWarning||console.warn("mongoose: calling `save()` on a subdoc does **not** save the document to MongoDB, it only runs save middleware. Use `subdoc.save({ suppressWarning: true })` to hide this warning if you're sure this behavior is right for your app."),c(e,function(t){r.$__save(t)})},p.prototype.$__save=function(t){var e=this;return s(function(){return t(null,e)})},
/*!
 * no-op for hooks
 */
p.prototype.$__remove=function(t){return t(null,this)},p.prototype.remove=function(t,e){if("function"!=typeof t||e||(e=t,t=void 0),!this.__parentArray||t&&t.noop)return e&&e(null),this;var r=void 0;if(!this.willRemove){if(!(r=this._doc._id))throw new Error("For your own good, Mongoose does not know how to remove an EmbeddedDocument that has no _id");this.__parentArray.pull({_id:r}),this.willRemove=!0,
/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {EmbeddedDocument} sub
 * @api private
 */
function(t){var e=t.ownerDocument();function r(){e.removeListener("save",r),e.removeListener("remove",r),t.emit("remove",t),t.constructor.emit("remove",t),e=t=null}e.on("save",r),e.on("remove",r)}(this)}return e&&e(null),this},p.prototype.update=function(){throw new Error("The #update method is not available on EmbeddedDocuments")},p.prototype.inspect=function(){return this.toObject({transform:!1,virtuals:!1,flattenDecimals:!1})},l.inspect.custom&&(
/*!
  * Avoid Node deprecation warning DEP0079
  */
p.prototype[l.inspect.custom]=p.prototype.inspect),p.prototype.invalidate=function(t,e,r){if(n.prototype.invalidate.call(this,t,e,r),!this[f]||null==this.__index){if(e[h]||e instanceof o)return!0;throw e}var i=this.__index,s=[this.__parentArray.$path(),i,t].join(".");return this[f].invalidate(s,e,r),!0},p.prototype.$markValid=function(t){if(this[f]){var e=this.__index;if(void 0!==e){var r=[this.__parentArray.$path(),e,t].join(".");this[f].$markValid(r)}}},
/*!
 * ignore
 */
p.prototype.$ignore=function(t){if(n.prototype.$ignore.call(this,t),this[f]){var e=this.__index;if(void 0!==e){var r=[this.__parentArray.$path(),e,t].join(".");this[f].$ignore(r)}}},p.prototype.$isValid=function(t){return void 0===this.__index||!this[f]||(!this[f].$__.validationError||!this[f].$__.validationError.errors[this.$__fullPath(t)])},p.prototype.ownerDocument=function(){if(this.$__.ownerDocument)return this.$__.ownerDocument;var t=this[f];if(!t)return this;for(;t[f]||t.$parent;)t=t[f]||t.$parent;return this.$__.ownerDocument=t,this.$__.ownerDocument},p.prototype.$__fullPath=function(t){if(!this.$__.fullPath){var e=this;if(!e[f])return t;for(var r=[];e[f]||e.$parent;)e[f]?r.unshift(e.__parentArray.$path()):r.unshift(e.$basePath),e=e[f]||e.$parent;this.$__.fullPath=r.join("."),this.$__.ownerDocument||(this.$__.ownerDocument=e)}return t?this.$__.fullPath+"."+t:this.$__.fullPath},p.prototype.parent=function(){return this[f]},p.prototype.parentArray=function(){return this.__parentArray},
/*!
 * Module exports.
 */
t.exports=p},function(t,e,r){"use strict";(function(e){if(void 0!==e)var n=r(1).Buffer;var i=r(15);function o(t,e){if(!(this instanceof o))return new o(t,e);if(!(null==t||"string"==typeof t||n.isBuffer(t)||t instanceof Uint8Array||Array.isArray(t)))throw new Error("only String, Buffer, Uint8Array or Array accepted");if(this._bsontype="Binary",t instanceof Number?(this.sub_type=t,this.position=0):(this.sub_type=null==e?s:e,this.position=0),null==t||t instanceof Number)void 0!==n?this.buffer=i.allocBuffer(o.BUFFER_SIZE):"undefined"!=typeof Uint8Array?this.buffer=new Uint8Array(new ArrayBuffer(o.BUFFER_SIZE)):this.buffer=new Array(o.BUFFER_SIZE),this.position=0;else{if("string"==typeof t)if(void 0!==n)this.buffer=i.toBuffer(t);else{if("undefined"==typeof Uint8Array&&"[object Array]"!==Object.prototype.toString.call(t))throw new Error("only String, Buffer, Uint8Array or Array accepted");this.buffer=a(t)}else this.buffer=t;this.position=t.length}}o.prototype.put=function(t){if(null!=t.length&&"number"!=typeof t&&1!==t.length)throw new Error("only accepts single character String, Uint8Array or Array");if("number"!=typeof t&&t<0||t>255)throw new Error("only accepts number in a valid unsigned byte range 0-255");var e=null;if(e="string"==typeof t?t.charCodeAt(0):null!=t.length?t[0]:t,this.buffer.length>this.position)this.buffer[this.position++]=e;else if(void 0!==n&&n.isBuffer(this.buffer)){var r=i.allocBuffer(o.BUFFER_SIZE+this.buffer.length);this.buffer.copy(r,0,0,this.buffer.length),this.buffer=r,this.buffer[this.position++]=e}else{r=null,r="[object Uint8Array]"===Object.prototype.toString.call(this.buffer)?new Uint8Array(new ArrayBuffer(o.BUFFER_SIZE+this.buffer.length)):new Array(o.BUFFER_SIZE+this.buffer.length);for(var s=0;s<this.buffer.length;s++)r[s]=this.buffer[s];this.buffer=r,this.buffer[this.position++]=e}},o.prototype.write=function(t,e){if(e="number"==typeof e?e:this.position,this.buffer.length<e+t.length){var r=null;if(void 0!==n&&n.isBuffer(this.buffer))r=i.allocBuffer(this.buffer.length+t.length),this.buffer.copy(r,0,0,this.buffer.length);else if("[object Uint8Array]"===Object.prototype.toString.call(this.buffer)){r=new Uint8Array(new ArrayBuffer(this.buffer.length+t.length));for(var o=0;o<this.position;o++)r[o]=this.buffer[o]}this.buffer=r}if(void 0!==n&&n.isBuffer(t)&&n.isBuffer(this.buffer))t.copy(this.buffer,e,0,t.length),this.position=e+t.length>this.position?e+t.length:this.position;else if(void 0!==n&&"string"==typeof t&&n.isBuffer(this.buffer))this.buffer.write(t,e,"binary"),this.position=e+t.length>this.position?e+t.length:this.position;else if("[object Uint8Array]"===Object.prototype.toString.call(t)||"[object Array]"===Object.prototype.toString.call(t)&&"string"!=typeof t){for(o=0;o<t.length;o++)this.buffer[e++]=t[o];this.position=e>this.position?e:this.position}else if("string"==typeof t){for(o=0;o<t.length;o++)this.buffer[e++]=t.charCodeAt(o);this.position=e>this.position?e:this.position}},o.prototype.read=function(t,e){if(e=e&&e>0?e:this.position,this.buffer.slice)return this.buffer.slice(t,t+e);for(var r="undefined"!=typeof Uint8Array?new Uint8Array(new ArrayBuffer(e)):new Array(e),n=0;n<e;n++)r[n]=this.buffer[t++];return r},o.prototype.value=function(t){if((t=null!=t&&t)&&void 0!==n&&n.isBuffer(this.buffer)&&this.buffer.length===this.position)return this.buffer;if(void 0!==n&&n.isBuffer(this.buffer))return t?this.buffer.slice(0,this.position):this.buffer.toString("binary",0,this.position);if(t){if(null!=this.buffer.slice)return this.buffer.slice(0,this.position);for(var e="[object Uint8Array]"===Object.prototype.toString.call(this.buffer)?new Uint8Array(new ArrayBuffer(this.position)):new Array(this.position),r=0;r<this.position;r++)e[r]=this.buffer[r];return e}return u(this.buffer,0,this.position)},o.prototype.length=function(){return this.position},o.prototype.toJSON=function(){return null!=this.buffer?this.buffer.toString("base64"):""},o.prototype.toString=function(t){return null!=this.buffer?this.buffer.slice(0,this.position).toString(t):""};var s=0,a=function(t){for(var e="undefined"!=typeof Uint8Array?new Uint8Array(new ArrayBuffer(t.length)):new Array(t.length),r=0;r<t.length;r++)e[r]=t.charCodeAt(r);return e},u=function(t,e,r){for(var n="",i=e;i<r;i++)n+=String.fromCharCode(t[i]);return n};o.BUFFER_SIZE=256,o.SUBTYPE_DEFAULT=0,o.SUBTYPE_FUNCTION=1,o.SUBTYPE_BYTE_ARRAY=2,o.SUBTYPE_UUID_OLD=3,o.SUBTYPE_UUID=4,o.SUBTYPE_MD5=5,o.SUBTYPE_USER_DEFINED=128,t.exports=o,t.exports.Binary=o}).call(this,r(11))},function(t,e,r){"use strict";
/*!
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */t.exports=function(t){return null!=t&&(null!=t.$__||t.isMongooseArray||t.isMongooseBuffer||t.$isMongooseMap)}},function(t,e,r){"use strict";var n=["find","findOne","update","updateMany","updateOne","replaceOne","remove","count","distinct","findAndModify","aggregate","findStream","deleteOne","deleteMany"];function i(){}for(var o=0,s=n.length;o<s;++o){var a=n[o];i.prototype[a]=u(a)}function u(t){return function(){throw new Error("collection."+t+" not implemented")}}t.exports=i,i.methods=n},function(t,e,r){"use strict";
/*!
 * Module requirements
 */var n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}();var i=r(4),o=r(3),s=function(t){function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var r=void 0;r=t&&"model"===t.constructor.name?t.constructor.modelName+" validation failed":"Validation failed";var n=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,r));return n.errors={},n._message=r,t&&(t.errors=n.errors),n}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,i),n(e,[{key:"toString",value:function(){return this.name+": "+a(this)}
/*!
     * inspect helper
     */},{key:"inspect",value:function(){return Object.assign(new Error(this.message),this)}
/*!
    * add message
    */},{key:"addError",value:function(t,e){this.errors[t]=e,this.message=this._message+": "+a(this)}}]),e}();
/*!
 * ignore
 */
function a(t){for(var e=Object.keys(t.errors||{}),r=e.length,n=[],i=void 0,o=0;o<r;++o)i=e[o],t!==t.errors[i]&&n.push(i+": "+t.errors[i].message);return n.join(", ")}
/*!
 * Module exports
 */o.inspect.custom&&(
/*!
  * Avoid Node deprecation warning DEP0079
  */
s.prototype[o.inspect.custom]=s.prototype.inspect)
/*!
 * Helper for JSON.stringify
 */,Object.defineProperty(s.prototype,"toJSON",{enumerable:!1,writable:!1,configurable:!0,value:function(){return Object.assign({},this,{message:this.message})}}),Object.defineProperty(s.prototype,"name",{value:"ValidationError"}),t.exports=s},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){function e(t,r,n){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),r=r||"Field `"+t+"` is not in schema and strict mode is set to throw.";var i=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,r));return i.isImmutableError=!!n,i.path=t,i}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"StrictModeError"}),t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(7),i=r(51),o=r(20);function s(t,e){if(e&&e.default){var r=e.default;Array.isArray(r)&&0===r.length?e.default=Array:!e.shared&&o(r)&&0===Object.keys(r).length&&(e.default=function(){return{}})}n.call(this,t,e,"Mixed"),this[i.schemaMixedSymbol]=!0}s.schemaName="Mixed",s.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
s.prototype=Object.create(n.prototype),s.prototype.constructor=s,s.get=n.get,s.set=n.set,s.prototype.cast=function(t){return t},s.prototype.castForQuery=function(t,e){return 2===arguments.length?e:t},
/*!
 * Module exports.
 */
t.exports=s},function(t,e,r){"use strict";
/*!
 * Module requirements.
 */var n=r(77);
/*!
 * @ignore
 */
/*!
 * @ignore
 */
function i(t){return n.cast()(t)}e.castToNumber=i,e.castArraysOfNumbers=function t(e,r){e.forEach(function(n,o){Array.isArray(n)?t(n,r):e[o]=i.call(r,n)})}},function(t,e,r){"use strict";var n=r(59),i=r(23),o=r(34),s=r(35),a=r(36),u=r(37),c=r(38),l=r(60),f=r(39),h=r(40),p=r(41),y=r(42),d=r(43),v=r(26),_=r(102),m=r(103),g=r(105),b=r(15),w=b.allocBuffer(17825792),O=function(){};O.prototype.serialize=function(t,e){var r="boolean"==typeof(e=e||{}).checkKeys&&e.checkKeys,n="boolean"==typeof e.serializeFunctions&&e.serializeFunctions,i="boolean"!=typeof e.ignoreUndefined||e.ignoreUndefined,o="number"==typeof e.minInternalBufferSize?e.minInternalBufferSize:17825792;w.length<o&&(w=b.allocBuffer(o));var s=m(w,t,r,0,0,n,i,[]),a=b.allocBuffer(s);return w.copy(a,0,0,a.length),a},O.prototype.serializeWithBufferAndIndex=function(t,e,r){var n="boolean"==typeof(r=r||{}).checkKeys&&r.checkKeys,i="boolean"==typeof r.serializeFunctions&&r.serializeFunctions,o="boolean"!=typeof r.ignoreUndefined||r.ignoreUndefined,s="number"==typeof r.index?r.index:0;return m(e,t,n,s||0,0,i,o)-1},O.prototype.deserialize=function(t,e){return _(t,e)},O.prototype.calculateObjectSize=function(t,e){var r="boolean"==typeof(e=e||{}).serializeFunctions&&e.serializeFunctions,n="boolean"!=typeof e.ignoreUndefined||e.ignoreUndefined;return g(t,r,n)},O.prototype.deserializeStream=function(t,e,r,n,i,o){o=null!=o?o:{};for(var s=e,a=0;a<r;a++){var u=t[s]|t[s+1]<<8|t[s+2]<<16|t[s+3]<<24;o.index=s,n[i+a]=this.deserialize(t,o),s+=u}return s},O.BSON_INT32_MAX=2147483647,O.BSON_INT32_MIN=-2147483648,O.BSON_INT64_MAX=Math.pow(2,63)-1,O.BSON_INT64_MIN=-Math.pow(2,63),O.JS_INT_MAX=9007199254740992,O.JS_INT_MIN=-9007199254740992,O.BSON_DATA_NUMBER=1,O.BSON_DATA_STRING=2,O.BSON_DATA_OBJECT=3,O.BSON_DATA_ARRAY=4,O.BSON_DATA_BINARY=5,O.BSON_DATA_OID=7,O.BSON_DATA_BOOLEAN=8,O.BSON_DATA_DATE=9,O.BSON_DATA_NULL=10,O.BSON_DATA_REGEXP=11,O.BSON_DATA_CODE=13,O.BSON_DATA_SYMBOL=14,O.BSON_DATA_CODE_W_SCOPE=15,O.BSON_DATA_INT=16,O.BSON_DATA_TIMESTAMP=17,O.BSON_DATA_LONG=18,O.BSON_DATA_MIN_KEY=255,O.BSON_DATA_MAX_KEY=127,O.BSON_BINARY_SUBTYPE_DEFAULT=0,O.BSON_BINARY_SUBTYPE_FUNCTION=1,O.BSON_BINARY_SUBTYPE_BYTE_ARRAY=2,O.BSON_BINARY_SUBTYPE_UUID=3,O.BSON_BINARY_SUBTYPE_MD5=4,O.BSON_BINARY_SUBTYPE_USER_DEFINED=128,t.exports=O,t.exports.Code=f,t.exports.Map=n,t.exports.Symbol=c,t.exports.BSON=O,t.exports.DBRef=d,t.exports.Binary=v,t.exports.ObjectID=a,t.exports.Long=i,t.exports.Timestamp=s,t.exports.Double=o,t.exports.Int32=l,t.exports.MinKey=p,t.exports.MaxKey=y,t.exports.BSONRegExp=u,t.exports.Decimal128=h},function(t,e,r){"use strict";function n(t){if(!(this instanceof n))return new n(t);this._bsontype="Double",this.value=t}n.prototype.valueOf=function(){return this.value},n.prototype.toJSON=function(){return this.value},t.exports=n,t.exports.Double=n},function(t,e,r){"use strict";function n(t,e){if(!(this instanceof n))return new n(t,e);this._bsontype="Timestamp",this.low_=0|t,this.high_=0|e}n.prototype.toInt=function(){return this.low_},n.prototype.toNumber=function(){return this.high_*n.TWO_PWR_32_DBL_+this.getLowBitsUnsigned()},n.prototype.toJSON=function(){return this.toString()},n.prototype.toString=function(t){var e=t||10;if(e<2||36<e)throw Error("radix out of range: "+e);if(this.isZero())return"0";if(this.isNegative()){if(this.equals(n.MIN_VALUE)){var r=n.fromNumber(e),i=this.div(r),o=i.multiply(r).subtract(this);return i.toString(e)+o.toInt().toString(e)}return"-"+this.negate().toString(e)}var s=n.fromNumber(Math.pow(e,6));o=this;for(var a="";!o.isZero();){var u=o.div(s),c=o.subtract(u.multiply(s)).toInt().toString(e);if((o=u).isZero())return c+a;for(;c.length<6;)c="0"+c;a=""+c+a}},n.prototype.getHighBits=function(){return this.high_},n.prototype.getLowBits=function(){return this.low_},n.prototype.getLowBitsUnsigned=function(){return this.low_>=0?this.low_:n.TWO_PWR_32_DBL_+this.low_},n.prototype.getNumBitsAbs=function(){if(this.isNegative())return this.equals(n.MIN_VALUE)?64:this.negate().getNumBitsAbs();for(var t=0!==this.high_?this.high_:this.low_,e=31;e>0&&0==(t&1<<e);e--);return 0!==this.high_?e+33:e+1},n.prototype.isZero=function(){return 0===this.high_&&0===this.low_},n.prototype.isNegative=function(){return this.high_<0},n.prototype.isOdd=function(){return 1==(1&this.low_)},n.prototype.equals=function(t){return this.high_===t.high_&&this.low_===t.low_},n.prototype.notEquals=function(t){return this.high_!==t.high_||this.low_!==t.low_},n.prototype.lessThan=function(t){return this.compare(t)<0},n.prototype.lessThanOrEqual=function(t){return this.compare(t)<=0},n.prototype.greaterThan=function(t){return this.compare(t)>0},n.prototype.greaterThanOrEqual=function(t){return this.compare(t)>=0},n.prototype.compare=function(t){if(this.equals(t))return 0;var e=this.isNegative(),r=t.isNegative();return e&&!r?-1:!e&&r?1:this.subtract(t).isNegative()?-1:1},n.prototype.negate=function(){return this.equals(n.MIN_VALUE)?n.MIN_VALUE:this.not().add(n.ONE)},n.prototype.add=function(t){var e=this.high_>>>16,r=65535&this.high_,i=this.low_>>>16,o=65535&this.low_,s=t.high_>>>16,a=65535&t.high_,u=t.low_>>>16,c=0,l=0,f=0,h=0;return f+=(h+=o+(65535&t.low_))>>>16,h&=65535,l+=(f+=i+u)>>>16,f&=65535,c+=(l+=r+a)>>>16,l&=65535,c+=e+s,c&=65535,n.fromBits(f<<16|h,c<<16|l)},n.prototype.subtract=function(t){return this.add(t.negate())},n.prototype.multiply=function(t){if(this.isZero())return n.ZERO;if(t.isZero())return n.ZERO;if(this.equals(n.MIN_VALUE))return t.isOdd()?n.MIN_VALUE:n.ZERO;if(t.equals(n.MIN_VALUE))return this.isOdd()?n.MIN_VALUE:n.ZERO;if(this.isNegative())return t.isNegative()?this.negate().multiply(t.negate()):this.negate().multiply(t).negate();if(t.isNegative())return this.multiply(t.negate()).negate();if(this.lessThan(n.TWO_PWR_24_)&&t.lessThan(n.TWO_PWR_24_))return n.fromNumber(this.toNumber()*t.toNumber());var e=this.high_>>>16,r=65535&this.high_,i=this.low_>>>16,o=65535&this.low_,s=t.high_>>>16,a=65535&t.high_,u=t.low_>>>16,c=65535&t.low_,l=0,f=0,h=0,p=0;return h+=(p+=o*c)>>>16,p&=65535,f+=(h+=i*c)>>>16,h&=65535,f+=(h+=o*u)>>>16,h&=65535,l+=(f+=r*c)>>>16,f&=65535,l+=(f+=i*u)>>>16,f&=65535,l+=(f+=o*a)>>>16,f&=65535,l+=e*c+r*u+i*a+o*s,l&=65535,n.fromBits(h<<16|p,l<<16|f)},n.prototype.div=function(t){if(t.isZero())throw Error("division by zero");if(this.isZero())return n.ZERO;if(this.equals(n.MIN_VALUE)){if(t.equals(n.ONE)||t.equals(n.NEG_ONE))return n.MIN_VALUE;if(t.equals(n.MIN_VALUE))return n.ONE;var e=this.shiftRight(1).div(t).shiftLeft(1);if(e.equals(n.ZERO))return t.isNegative()?n.ONE:n.NEG_ONE;var r=this.subtract(t.multiply(e));return e.add(r.div(t))}if(t.equals(n.MIN_VALUE))return n.ZERO;if(this.isNegative())return t.isNegative()?this.negate().div(t.negate()):this.negate().div(t).negate();if(t.isNegative())return this.div(t.negate()).negate();var i=n.ZERO;for(r=this;r.greaterThanOrEqual(t);){e=Math.max(1,Math.floor(r.toNumber()/t.toNumber()));for(var o=Math.ceil(Math.log(e)/Math.LN2),s=o<=48?1:Math.pow(2,o-48),a=n.fromNumber(e),u=a.multiply(t);u.isNegative()||u.greaterThan(r);)e-=s,u=(a=n.fromNumber(e)).multiply(t);a.isZero()&&(a=n.ONE),i=i.add(a),r=r.subtract(u)}return i},n.prototype.modulo=function(t){return this.subtract(this.div(t).multiply(t))},n.prototype.not=function(){return n.fromBits(~this.low_,~this.high_)},n.prototype.and=function(t){return n.fromBits(this.low_&t.low_,this.high_&t.high_)},n.prototype.or=function(t){return n.fromBits(this.low_|t.low_,this.high_|t.high_)},n.prototype.xor=function(t){return n.fromBits(this.low_^t.low_,this.high_^t.high_)},n.prototype.shiftLeft=function(t){if(0===(t&=63))return this;var e=this.low_;if(t<32){var r=this.high_;return n.fromBits(e<<t,r<<t|e>>>32-t)}return n.fromBits(0,e<<t-32)},n.prototype.shiftRight=function(t){if(0===(t&=63))return this;var e=this.high_;if(t<32){var r=this.low_;return n.fromBits(r>>>t|e<<32-t,e>>t)}return n.fromBits(e>>t-32,e>=0?0:-1)},n.prototype.shiftRightUnsigned=function(t){if(0===(t&=63))return this;var e=this.high_;if(t<32){var r=this.low_;return n.fromBits(r>>>t|e<<32-t,e>>>t)}return 32===t?n.fromBits(e,0):n.fromBits(e>>>t-32,0)},n.fromInt=function(t){if(-128<=t&&t<128){var e=n.INT_CACHE_[t];if(e)return e}var r=new n(0|t,t<0?-1:0);return-128<=t&&t<128&&(n.INT_CACHE_[t]=r),r},n.fromNumber=function(t){return isNaN(t)||!isFinite(t)?n.ZERO:t<=-n.TWO_PWR_63_DBL_?n.MIN_VALUE:t+1>=n.TWO_PWR_63_DBL_?n.MAX_VALUE:t<0?n.fromNumber(-t).negate():new n(t%n.TWO_PWR_32_DBL_|0,t/n.TWO_PWR_32_DBL_|0)},n.fromBits=function(t,e){return new n(t,e)},n.fromString=function(t,e){if(0===t.length)throw Error("number format error: empty string");var r=e||10;if(r<2||36<r)throw Error("radix out of range: "+r);if("-"===t.charAt(0))return n.fromString(t.substring(1),r).negate();if(t.indexOf("-")>=0)throw Error('number format error: interior "-" character: '+t);for(var i=n.fromNumber(Math.pow(r,8)),o=n.ZERO,s=0;s<t.length;s+=8){var a=Math.min(8,t.length-s),u=parseInt(t.substring(s,s+a),r);if(a<8){var c=n.fromNumber(Math.pow(r,a));o=o.multiply(c).add(n.fromNumber(u))}else o=(o=o.multiply(i)).add(n.fromNumber(u))}return o},n.INT_CACHE_={},n.TWO_PWR_16_DBL_=65536,n.TWO_PWR_24_DBL_=1<<24,n.TWO_PWR_32_DBL_=n.TWO_PWR_16_DBL_*n.TWO_PWR_16_DBL_,n.TWO_PWR_31_DBL_=n.TWO_PWR_32_DBL_/2,n.TWO_PWR_48_DBL_=n.TWO_PWR_32_DBL_*n.TWO_PWR_16_DBL_,n.TWO_PWR_64_DBL_=n.TWO_PWR_32_DBL_*n.TWO_PWR_32_DBL_,n.TWO_PWR_63_DBL_=n.TWO_PWR_64_DBL_/2,n.ZERO=n.fromInt(0),n.ONE=n.fromInt(1),n.NEG_ONE=n.fromInt(-1),n.MAX_VALUE=n.fromBits(-1,2147483647),n.MIN_VALUE=n.fromBits(0,-2147483648),n.TWO_PWR_24_=n.fromInt(1<<24),t.exports=n,t.exports.Timestamp=n},function(t,e,r){"use strict";(function(e,n){var i="inspect",o=r(15),s=parseInt(16777215*Math.random(),10),a=new RegExp("^[0-9a-fA-F]{24}$");try{if(e&&e.from){var u=!0;i=r(3).inspect.custom||"inspect"}}catch(t){u=!1}for(var c=function t(e){if(e instanceof t)return e;if(!(this instanceof t))return new t(e);if(this._bsontype="ObjectID",null==e||"number"==typeof e)return this.id=this.generate(e),void(t.cacheHexString&&(this.__id=this.toString("hex")));var r=t.isValid(e);if(!r&&null!=e)throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");if(r&&"string"==typeof e&&24===e.length&&u)return new t(o.toBuffer(e,"hex"));if(r&&"string"==typeof e&&24===e.length)return t.createFromHexString(e);if(null==e||12!==e.length){if(null!=e&&e.toHexString)return e;throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters")}this.id=e,t.cacheHexString&&(this.__id=this.toString("hex"))},l=[],f=0;f<256;f++)l[f]=(f<=15?"0":"")+f.toString(16);c.prototype.toHexString=function(){if(c.cacheHexString&&this.__id)return this.__id;var t="";if(!this.id||!this.id.length)throw new Error("invalid ObjectId, ObjectId.id must be either a string or a Buffer, but is ["+JSON.stringify(this.id)+"]");if(this.id instanceof p)return t=y(this.id),c.cacheHexString&&(this.__id=t),t;for(var e=0;e<this.id.length;e++)t+=l[this.id.charCodeAt(e)];return c.cacheHexString&&(this.__id=t),t},c.prototype.get_inc=function(){return c.index=(c.index+1)%16777215},c.prototype.getInc=function(){return this.get_inc()},c.prototype.generate=function(t){"number"!=typeof t&&(t=~~(Date.now()/1e3));var e=(void 0===n||1===n.pid?Math.floor(1e5*Math.random()):n.pid)%65535,r=this.get_inc(),i=o.allocBuffer(12);return i[3]=255&t,i[2]=t>>8&255,i[1]=t>>16&255,i[0]=t>>24&255,i[6]=255&s,i[5]=s>>8&255,i[4]=s>>16&255,i[8]=255&e,i[7]=e>>8&255,i[11]=255&r,i[10]=r>>8&255,i[9]=r>>16&255,i},c.prototype.toString=function(t){return this.id&&this.id.copy?this.id.toString("string"==typeof t?t:"hex"):this.toHexString()},c.prototype[i]=c.prototype.toString,c.prototype.toJSON=function(){return this.toHexString()},c.prototype.equals=function(t){return t instanceof c?this.toString()===t.toString():"string"==typeof t&&c.isValid(t)&&12===t.length&&this.id instanceof p?t===this.id.toString("binary"):"string"==typeof t&&c.isValid(t)&&24===t.length?t.toLowerCase()===this.toHexString():"string"==typeof t&&c.isValid(t)&&12===t.length?t===this.id:!(null==t||!(t instanceof c||t.toHexString))&&t.toHexString()===this.toHexString()},c.prototype.getTimestamp=function(){var t=new Date,e=this.id[3]|this.id[2]<<8|this.id[1]<<16|this.id[0]<<24;return t.setTime(1e3*Math.floor(e)),t},c.index=~~(16777215*Math.random()),c.createPk=function(){return new c},c.createFromTime=function(t){var e=o.toBuffer([0,0,0,0,0,0,0,0,0,0,0,0]);return e[3]=255&t,e[2]=t>>8&255,e[1]=t>>16&255,e[0]=t>>24&255,new c(e)};var h=[];for(f=0;f<10;)h[48+f]=f++;for(;f<16;)h[55+f]=h[87+f]=f++;var p=e,y=function(t){return t.toString("hex")};c.createFromHexString=function(t){if(void 0===t||null!=t&&24!==t.length)throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");if(u)return new c(o.toBuffer(t,"hex"));for(var e=new p(12),r=0,n=0;n<24;)e[r++]=h[t.charCodeAt(n++)]<<4|h[t.charCodeAt(n++)];return new c(e)},c.isValid=function(t){return null!=t&&("number"==typeof t||("string"==typeof t?12===t.length||24===t.length&&a.test(t):t instanceof c||(t instanceof p||!!t.toHexString&&(12===t.id.length||24===t.id.length&&a.test(t.id)))))},Object.defineProperty(c.prototype,"generationTime",{enumerable:!0,get:function(){return this.id[3]|this.id[2]<<8|this.id[1]<<16|this.id[0]<<24},set:function(t){this.id[3]=255&t,this.id[2]=t>>8&255,this.id[1]=t>>16&255,this.id[0]=t>>24&255}}),t.exports=c,t.exports.ObjectID=c,t.exports.ObjectId=c}).call(this,r(1).Buffer,r(8))},function(t,e,r){"use strict";function n(t,e){if(!(this instanceof n))return new n;this._bsontype="BSONRegExp",this.pattern=t||"",this.options=e||"";for(var r=0;r<this.options.length;r++)if("i"!==this.options[r]&&"m"!==this.options[r]&&"x"!==this.options[r]&&"l"!==this.options[r]&&"s"!==this.options[r]&&"u"!==this.options[r])throw new Error("the regular expression options ["+this.options[r]+"] is not supported")}t.exports=n,t.exports.BSONRegExp=n},function(t,e,r){"use strict";(function(e){var n=e&&r(3).inspect.custom||"inspect";function i(t){if(!(this instanceof i))return new i(t);this._bsontype="Symbol",this.value=t}i.prototype.valueOf=function(){return this.value},i.prototype.toString=function(){return this.value},i.prototype[n]=function(){return this.value},i.prototype.toJSON=function(){return this.value},t.exports=i,t.exports.Symbol=i}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n=function t(e,r){if(!(this instanceof t))return new t(e,r);this._bsontype="Code",this.code=e,this.scope=r};n.prototype.toJSON=function(){return{scope:this.scope,code:this.code}},t.exports=n,t.exports.Code=n},function(t,e,r){"use strict";var n=r(23),i=/^(\+|-)?(\d+|(\d*\.\d*))?(E|e)?([-+])?(\d+)?$/,o=/^(\+|-)?(Infinity|inf)$/i,s=/^(\+|-)?NaN$/i,a=6176,u=[124,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].reverse(),c=[248,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].reverse(),l=[120,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].reverse(),f=/^([-+])?(\d+)?$/,h=r(15),p=function(t){return!isNaN(parseInt(t,10))},y=function(t){var e=n.fromNumber(1e9),r=n.fromNumber(0),i=0;if(!(t.parts[0]||t.parts[1]||t.parts[2]||t.parts[3]))return{quotient:t,rem:r};for(i=0;i<=3;i++)r=(r=r.shiftLeft(32)).add(new n(t.parts[i],0)),t.parts[i]=r.div(e).low_,r=r.modulo(e);return{quotient:t,rem:r}},d=function(t){this._bsontype="Decimal128",this.bytes=t};d.fromString=function(t){var e,r=!1,y=!1,v=!1,_=0,m=0,g=0,b=0,w=0,O=[0],S=0,E=0,A=0,j=0,$=0,x=0,P=[0,0],N=[0,0],T=0;if((t=t.trim()).length>=7e3)throw new Error(t+" not a valid Decimal128 string");var k=t.match(i),B=t.match(o),C=t.match(s);if(!k&&!B&&!C||0===t.length)throw new Error(t+" not a valid Decimal128 string");if(k&&k[4]&&void 0===k[2])throw new Error(t+" not a valid Decimal128 string");if("+"!==t[T]&&"-"!==t[T]||(r="-"===t[T++]),!p(t[T])&&"."!==t[T]){if("i"===t[T]||"I"===t[T])return new d(h.toBuffer(r?c:l));if("N"===t[T])return new d(h.toBuffer(u))}for(;p(t[T])||"."===t[T];)if("."!==t[T])S<34&&("0"!==t[T]||v)&&(v||(w=m),v=!0,O[E++]=parseInt(t[T],10),S+=1),v&&(g+=1),y&&(b+=1),m+=1,T+=1;else{if(y)return new d(h.toBuffer(u));y=!0,T+=1}if(y&&!m)throw new Error(t+" not a valid Decimal128 string");if("e"===t[T]||"E"===t[T]){var D=t.substr(++T).match(f);if(!D||!D[2])return new d(h.toBuffer(u));$=parseInt(D[0],10),T+=D[0].length}if(t[T])return new d(h.toBuffer(u));if(A=0,S){if(j=S-1,_=g,0!==$&&1!==_)for(;"0"===t[w+_-1];)_-=1}else A=0,j=0,O[0]=0,g=1,S=1,_=0;for($<=b&&b-$>16384?$=-6176:$-=b;$>6111;){if((j+=1)-A>34){var M=O.join("");if(M.match(/^0+$/)){$=6111;break}return new d(h.toBuffer(r?c:l))}$-=1}for(;$<-6176||S<g;){if(0===j){$=-6176,_=0;break}if(S<g?g-=1:j-=1,!($<6111)){if((M=O.join("")).match(/^0+$/)){$=6111;break}return new d(h.toBuffer(r?c:l))}$+=1}if(j-A+1<_&&"0"!==t[_]){var R=m;y&&-6176===$&&(w+=1,R+=1);var F=parseInt(t[w+j+1],10),I=0;if(F>=5&&(I=1,5===F))for(I=O[j]%2==1,x=w+j+2;x<R;x++)if(parseInt(t[x],10)){I=1;break}if(I)for(var L=j;L>=0&&++O[L]>9;L--)if(O[L]=0,0===L){if(!($<6111))return new d(h.toBuffer(r?c:l));$+=1,O[L]=1}}if(P=n.fromNumber(0),N=n.fromNumber(0),0===_)P=n.fromNumber(0),N=n.fromNumber(0);else if(j-A<17)for(L=A,N=n.fromNumber(O[L++]),P=new n(0,0);L<=j;L++)N=(N=N.multiply(n.fromNumber(10))).add(n.fromNumber(O[L]));else{for(L=A,P=n.fromNumber(O[L++]);L<=j-17;L++)P=(P=P.multiply(n.fromNumber(10))).add(n.fromNumber(O[L]));for(N=n.fromNumber(O[L++]);L<=j;L++)N=(N=N.multiply(n.fromNumber(10))).add(n.fromNumber(O[L]))}var U=function(t,e){if(!t&&!e)return{high:n.fromNumber(0),low:n.fromNumber(0)};var r=t.shiftRightUnsigned(32),i=new n(t.getLowBits(),0),o=e.shiftRightUnsigned(32),s=new n(e.getLowBits(),0),a=r.multiply(o),u=r.multiply(s),c=i.multiply(o),l=i.multiply(s);return a=a.add(u.shiftRightUnsigned(32)),u=new n(u.getLowBits(),0).add(c).add(l.shiftRightUnsigned(32)),{high:a=a.add(u.shiftRightUnsigned(32)),low:l=u.shiftLeft(32).add(new n(l.getLowBits(),0))}}(P,n.fromString("100000000000000000"));U.low=U.low.add(N),function(t,e){var r=t.high_>>>0,n=e.high_>>>0;return r<n||r===n&&t.low_>>>0<e.low_>>>0}(U.low,N)&&(U.high=U.high.add(n.fromNumber(1))),e=$+a;var V={low:n.fromNumber(0),high:n.fromNumber(0)};U.high.shiftRightUnsigned(49).and(n.fromNumber(1)).equals(n.fromNumber)?(V.high=V.high.or(n.fromNumber(3).shiftLeft(61)),V.high=V.high.or(n.fromNumber(e).and(n.fromNumber(16383).shiftLeft(47))),V.high=V.high.or(U.high.and(n.fromNumber(0x7fffffffffff)))):(V.high=V.high.or(n.fromNumber(16383&e).shiftLeft(49)),V.high=V.high.or(U.high.and(n.fromNumber(562949953421311)))),V.low=U.low,r&&(V.high=V.high.or(n.fromString("9223372036854775808")));var q=h.allocBuffer(16);return T=0,q[T++]=255&V.low.low_,q[T++]=V.low.low_>>8&255,q[T++]=V.low.low_>>16&255,q[T++]=V.low.low_>>24&255,q[T++]=255&V.low.high_,q[T++]=V.low.high_>>8&255,q[T++]=V.low.high_>>16&255,q[T++]=V.low.high_>>24&255,q[T++]=255&V.high.low_,q[T++]=V.high.low_>>8&255,q[T++]=V.high.low_>>16&255,q[T++]=V.high.low_>>24&255,q[T++]=255&V.high.high_,q[T++]=V.high.high_>>8&255,q[T++]=V.high.high_>>16&255,q[T++]=V.high.high_>>24&255,new d(q)};a=6176,d.prototype.toString=function(){for(var t,e,r,i,o,s,u=0,c=new Array(36),l=0;l<c.length;l++)c[l]=0;var f,h,p,d,v,_=0,m=!1,g={parts:new Array(4)},b=[];_=0;var w=this.bytes;if(i=w[_++]|w[_++]<<8|w[_++]<<16|w[_++]<<24,r=w[_++]|w[_++]<<8|w[_++]<<16|w[_++]<<24,e=w[_++]|w[_++]<<8|w[_++]<<16|w[_++]<<24,t=w[_++]|w[_++]<<8|w[_++]<<16|w[_++]<<24,_=0,{low:new n(i,r),high:new n(e,t)}.high.lessThan(n.ZERO)&&b.push("-"),(o=t>>26&31)>>3==3){if(30===o)return b.join("")+"Infinity";if(31===o)return"NaN";s=t>>15&16383,p=8+(t>>14&1)}else p=t>>14&7,s=t>>17&16383;if(f=s-a,g.parts[0]=(16383&t)+((15&p)<<14),g.parts[1]=e,g.parts[2]=r,g.parts[3]=i,0===g.parts[0]&&0===g.parts[1]&&0===g.parts[2]&&0===g.parts[3])m=!0;else for(v=3;v>=0;v--){var O=0,S=y(g);if(g=S.quotient,O=S.rem.low_)for(d=8;d>=0;d--)c[9*v+d]=O%10,O=Math.floor(O/10)}if(m)u=1,c[_]=0;else for(u=36,l=0;!c[_];)l++,u-=1,_+=1;if((h=u-1+f)>=34||h<=-7||f>0){for(b.push(c[_++]),(u-=1)&&b.push("."),l=0;l<u;l++)b.push(c[_++]);b.push("E"),h>0?b.push("+"+h):b.push(h)}else if(f>=0)for(l=0;l<u;l++)b.push(c[_++]);else{var E=u+f;if(E>0)for(l=0;l<E;l++)b.push(c[_++]);else b.push("0");for(b.push(".");E++<0;)b.push("0");for(l=0;l<u-Math.max(E-1,0);l++)b.push(c[_++])}return b.join("")},d.prototype.toJSON=function(){return{$numberDecimal:this.toString()}},t.exports=d,t.exports.Decimal128=d},function(t,e,r){"use strict";function n(){if(!(this instanceof n))return new n;this._bsontype="MinKey"}t.exports=n,t.exports.MinKey=n},function(t,e,r){"use strict";function n(){if(!(this instanceof n))return new n;this._bsontype="MaxKey"}t.exports=n,t.exports.MaxKey=n},function(t,e,r){"use strict";function n(t,e,r){if(!(this instanceof n))return new n(t,e,r);this._bsontype="DBRef",this.namespace=t,this.oid=e,this.db=r}n.prototype.toJSON=function(){return{$ref:this.namespace,$id:this.oid,$db:null==this.db?"":this.db}},t.exports=n,t.exports.DBRef=n},function(t,e,r){"use strict";t.exports=r(112)},function(t,e,r){"use strict";var n=r(1),i=n.Buffer;function o(t,e){for(var r in t)e[r]=t[r]}function s(t,e,r){return i(t,e,r)}i.from&&i.alloc&&i.allocUnsafe&&i.allocUnsafeSlow?t.exports=n:(o(n,e),e.Buffer=s),o(i,s),s.from=function(t,e,r){if("number"==typeof t)throw new TypeError("Argument must not be a number");return i(t,e,r)},s.alloc=function(t,e,r){if("number"!=typeof t)throw new TypeError("Argument must be a number");var n=i(t);return void 0!==e?"string"==typeof r?n.fill(e,r):n.fill(e):n.fill(0),n},s.allocUnsafe=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return i(t)},s.allocUnsafeSlow=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return n.SlowBuffer(t)}},function(t,e,r){"use strict";var n=r(63),i=r(19),o=r(13),s=r(47),a=r(27),u=r(64),c=r(65),l=r(20),f=r(0);
/*!
 * Object clone with Mongoose natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @param {Boolean} isArrayChild true if cloning immediately underneath an array. Special case for minimize.
 * @return {Object} the cloned object
 * @api private
 */
function h(t,e,r){if(null==t)return t;if(Array.isArray(t))return function(t,e){var r=[],n=!0,i=!1,o=void 0;try{for(var s,a=t[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value;r.push(h(u,e,!0))}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}return r}(t,e);if(a(t))return e&&e._skipSingleNestedGetters&&t.$isSingleNested&&(e=Object.assign({},e,{getters:!1})),e&&e.json&&"function"==typeof t.toJSON?t.toJSON(e):t.toObject(e);if(t.constructor)switch(u(t.constructor)){case"Object":return p(t,e,r);case"Date":return new t.constructor(+t);case"RegExp":return n(t)}return t instanceof o?new o(t.id):c(t,"Decimal128")?e&&e.flattenDecimals?t.toJSON():i.fromString(t.toString()):!t.constructor&&l(t)?p(t,e,r):t[f.schemaTypeSymbol]?t.clone():e&&e.bson&&"function"==typeof t.toBSON?t:null!=t.valueOf?t.valueOf():p(t,e,r)}
/*!
 * ignore
 */
function p(t,e,r){var n=e&&e.minimize,i={},o=void 0;for(var a in t)if(!s.has(a)){var u=h(t[a],e);n&&void 0===u||(!1===n&&void 0===u?delete i[a]:(o||(o=!0),i[a]=u))}return n&&!r?o&&i:i}t.exports=h},function(t,e,r){"use strict";t.exports=new Set(["__proto__","constructor","prototype"])},function(t,e,r){"use strict";var n=r(49);
/*!
 * ignore
 */t.exports=function(t){var e=null!=this?this.path:null;return n(t,e)}},function(t,e,r){"use strict";var n=r(12);
/*!
 * Given a value, cast it to a boolean, or throw a `CastError` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @param {String} [path] optional the path to set on the CastError
 * @return {Boolean|null|undefined}
 * @throws {CastError} if `value` is not one of the allowed values
 * @api private
 */t.exports=function(e,r){if(null==e)return e;if(t.exports.convertToTrue.has(e))return!0;if(t.exports.convertToFalse.has(e))return!1;throw new n("boolean",e,r)},t.exports.convertToTrue=new Set([!0,"true",1,"1","yes"]),t.exports.convertToFalse=new Set([!1,"false",0,"0","no"])},function(t,e,r){"use strict";(function(e){
/*!
 * Centralize this so we can more easily work around issues with people
 * stubbing out `process.nextTick()` in tests using sinon:
 * https://github.com/sinonjs/lolex#automatically-incrementing-mocked-time
 * See gh-6074
 */
t.exports=function(t){return e.nextTick(t)}}).call(this,r(8))},function(t,e,r){"use strict";e.schemaMixedSymbol=Symbol.for("mongoose:schema_mixed"),e.builtInMiddleware=Symbol.for("mongoose:built-in-middleware")},function(t,e,r){"use strict";(function(n){
/*!
 * Module dependencies.
 */
var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};function o(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var s=r(18).EventEmitter,a=r(135),u=r(16),c=r(7),l=r(9),f=r(136),h=r(53),p=r(73),y=r(137),d=r(139),v=r(0).arrayParentSymbol,_=r(5),m=r(140),g=r(74),b=r(141),w=r(44),O=r(14).get().ReadPreference,S=r(51),E=r(3),A=r(2),j=r(142),$=void 0,x=r(143).middlewareFunctions,P=r(75).middlewareFunctions,N=x.concat(P).reduce(function(t,e){return t.add(e)},new Set),T=0;function k(t,e){if(!(this instanceof k))return new k(t,e);if(this.obj=t,this.paths={},this.aliases={},this.subpaths={},this.virtuals={},this.singleNestedPaths={},this.nested={},this.inherits={},this.callQueue=[],this._indexes=[],this.methods={},this.methodOptions={},this.statics={},this.tree={},this.query={},this.childSchemas=[],this.plugins=[],this.$id=++T,this.s={hooks:new a},this.options=this.defaultOptions(e),Array.isArray(t)){var r=!0,n=!1,i=void 0;try{for(var o,s=t[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var u=o.value;this.add(u)}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}}else t&&this.add(t);var c=t&&t._id&&A.isObject(t._id);!this.paths._id&&!this.options.noId&&this.options._id&&!c&&p(this),this.setupTimestamp(this.options.timestamps)}
/*!
 * Create virtual properties with alias field
 */
/*!
 * Inherit from EventEmitter.
 */
k.prototype=Object.create(s.prototype),k.prototype.constructor=k,k.prototype.instanceOfSchema=!0,
/*!
 * ignore
 */
Object.defineProperty(k.prototype,"$schemaType",{configurable:!1,enumerable:!1,writable:!0}),Object.defineProperty(k.prototype,"childSchemas",{configurable:!1,enumerable:!0,writable:!0}),k.prototype.obj,k.prototype.paths,k.prototype.tree,k.prototype.clone=function(){var t=this,e=new k({},this._userProvidedOptions);return e.base=this.base,e.obj=this.obj,e.options=A.clone(this.options),e.callQueue=this.callQueue.map(function(t){return t}),e.methods=A.clone(this.methods),e.methodOptions=A.clone(this.methodOptions),e.statics=A.clone(this.statics),e.query=A.clone(this.query),e.plugins=Array.prototype.slice.call(this.plugins),e._indexes=A.clone(this._indexes),e.s.hooks=this.s.hooks.clone(),e.tree=A.clone(this.tree),e.paths=A.clone(this.paths),e.nested=A.clone(this.nested),e.subpaths=A.clone(this.subpaths),e.singleNestedPaths=A.clone(this.singleNestedPaths),e.childSchemas=
/*!
 * ignore
 */
function(t){var e=[],r=!0,n=!1,i=void 0;try{for(var o,s=Object.keys(t.paths)[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value,u=t.paths[a];(u.$isMongooseDocumentArray||u.$isSingleNested)&&e.push({schema:u.schema,model:u.caster})}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return e}
/*!
 * ignore
 */(e),e.virtuals=A.clone(this.virtuals),e.$globalPluginsApplied=this.$globalPluginsApplied,e.$isRootDiscriminator=this.$isRootDiscriminator,e.$implicitlyCreated=this.$implicitlyCreated,null!=this.discriminatorMapping&&(e.discriminatorMapping=Object.assign({},this.discriminatorMapping)),null!=this.discriminators&&(e.discriminators=Object.assign({},this.discriminators)),e.aliases=Object.assign({},this.aliases),e.on("init",function(e){return t.emit("init",e)}),e},k.prototype.pick=function(t,e){var r=new k({},e||this.options);if(!Array.isArray(t))throw new u('Schema#pick() only accepts an array argument, got "'+(void 0===t?"undefined":i(t))+'"');var n=!0,s=!1,a=void 0;try{for(var c,l=t[Symbol.iterator]();!(n=(c=l.next()).done);n=!0){var f=c.value;if(this.nested[f])r.add(o({},f,_(this.tree,f)));else{var h=this.path(f);if(null==h)throw new u("Path `"+f+"` is not in the schema");r.add(o({},f,h))}}}catch(t){s=!0,a=t}finally{try{!n&&l.return&&l.return()}finally{if(s)throw a}}return r},k.prototype.defaultOptions=function(t){t&&!1===t.safe&&(t.safe={w:0}),t&&t.safe&&0===t.safe.w&&(t.versionKey=!1),this._userProvidedOptions=null==t?{}:A.clone(t);var e=_(this,"base.options",{});return(t=A.options({strict:!("strict"in e)||e.strict,bufferCommands:!0,capped:!1,versionKey:"__v",discriminatorKey:"__t",minimize:!0,autoIndex:null,shardKey:null,read:null,validateBeforeSave:!0,noId:!1,_id:!0,noVirtualId:!1,id:!0,typeKey:"type",typePojoToMixed:!("typePojoToMixed"in e)||e.typePojoToMixed},A.clone(t))).read&&(t.read=O(t.read)),t},k.prototype.add=function(t,e){if(t instanceof k)return b(this,t),this;!1===t._id&&null==e&&(this.options._id=!1),e=e||"";var r=Object.keys(t),n=!0,i=!1,o=void 0;try{for(var s,a=r[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value,c=e+u;if(null==t[u])throw new TypeError("Invalid value for schema path `"+c+'`, got value "'+t[u]+'"');if("_id"!==u||!1!==t[u])if(t[u]instanceof h)this.virtual(t[u]);else{if(Array.isArray(t[u])&&1===t[u].length&&null==t[u][0])throw new TypeError("Invalid value for schema Array path `"+c+'`, got value "'+t[u][0]+'"');if(A.isPOJO(t[u])||t[u]instanceof l)if(Object.keys(t[u]).length<1)e&&(this.nested[e.substr(0,e.length-1)]=!0),this.path(c,t[u]);else if(!t[u][this.options.typeKey]||"type"===this.options.typeKey&&t[u].type.type)this.nested[c]=!0,this.add(t[u],c+".");else if(!this.options.typePojoToMixed&&A.isPOJO(t[u][this.options.typeKey])){e&&(this.nested[e.substr(0,e.length-1)]=!0);var f=new k(t[u][this.options.typeKey],{typePojoToMixed:!1}),p=Object.assign({},t[u],{type:f});this.path(e+u,p)}else e&&(this.nested[e.substr(0,e.length-1)]=!0),this.path(e+u,t[u]);else e&&(this.nested[e.substr(0,e.length-1)]=!0),this.path(e+u,t[u])}}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}return function(t,e){e=e||Object.keys(t.paths);var r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value,u=_(t.paths[a],"options");if(null!=u){var c=t.paths[a].path,l=u.alias;if(l){if("string"!=typeof l)throw new Error("Invalid value for alias option on "+c+", got "+l);t.aliases[l]=c,t.virtual(l).get(function(t){return function(){return"function"==typeof this.get?this.get(t):this[t]}}(c)).set(function(t){return function(e){return this.set(t,e)}}(c))}}}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}}(this,Object.keys(t).map(function(t){return e?e+t:t})),this},k.reserved=Object.create(null),k.prototype.reserved=k.reserved;var B=k.reserved;B.prototype=B.emit=B.listeners=B.on=B.removeListener=B.collection=B.errors=B.get=B.init=B.isModified=B.isNew=B.populated=B.remove=B.save=B.schema=B.toObject=B.validate=1;
/*!
 * Document keys to print warnings for
 */
var C={};
/*!
 * ignore
 */
function D(t){return/\.\d+/.test(t)?t.replace(/\.\d+\./g,".$.").replace(/\.\d+$/,".$"):t}
/*!
 * ignore
 */function M(t,e){var r=!0,n=!1,i=void 0;try{for(var o,s=Object.keys(t.paths)[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;if(a.includes(".$*"))if(new RegExp("^"+a.replace(/\.\$\*/g,"\\.[^.]+")+"$").test(e))return t.paths[a]}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return null}
/*!
 * ignore. Deprecated re: #6405
 */
function R(t,e){var r=e.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);if(r.length<2)return t.paths.hasOwnProperty(r[0])?t.paths[r[0]]:"adhocOrUndefined";var n=t.path(r[0]),i=!1;if(!n)return"adhocOrUndefined";for(var o=r.length-1,s=1;s<r.length;++s){i=!1;var a=r[s];if(s===o&&n&&!/\D/.test(a)){n=n.$isMongooseDocumentArray?n.$embeddedSchemaType:n instanceof $.Array?n.caster:void 0;break}if(/\D/.test(a)){if(!n||!n.schema){n=void 0;break}i="nested"===n.schema.pathType(a),n=n.schema.path(a)}else n instanceof $.Array&&s!==o&&(n=n.caster)}return t.subpaths[e]=n,n?"real":i?"nested":"adhocOrUndefined"}
/*!
 * ignore
 */C.increment="`increment` should not be used as a schema path name unless you have disabled versioning.",k.prototype.path=function(t,e){var r=D(t);if(void 0===e){var n=function(t,e,r){if(t.paths.hasOwnProperty(e))return t.paths[e];if(t.subpaths.hasOwnProperty(r))return t.subpaths[r];if(t.singleNestedPaths.hasOwnProperty(r))return t.singleNestedPaths[r];return null}(this,t,r);if(null!=n)return n;var o=M(this,t);return null!=o?o:null!=(n=this.hasMixedParent(r))?n:/\.\d+\.?.*$/.test(t)?function(t,e){return R(t,e),t.subpaths[e]}(this,t):void 0}var s=t.split(".")[0];if(B[s])throw new Error("`"+s+"` may not be used as a schema pathname");C[t]&&console.log("WARN: "+C[t]),"object"===(void 0===e?"undefined":i(e))&&A.hasUserDefinedProperty(e,"ref")&&j(e.ref,t);var a=t.split(/\./),u=a.pop(),l=this.tree,f="",h=!0,p=!1,y=void 0;try{for(var d,v=a[Symbol.iterator]();!(h=(d=v.next()).done);h=!0){var _=d.value;if(f=f+=(f.length>0?".":"")+_,l[_]||(this.nested[f]=!0,l[_]={}),"object"!==i(l[_])){var m="Cannot set nested path `"+t+"`. Parent path `"+f+"` already set to type "+l[_].name+".";throw new Error(m)}l=l[_]}}catch(t){p=!0,y=t}finally{try{!h&&v.return&&v.return()}finally{if(p)throw y}}l[u]=A.clone(e),this.paths[t]=this.interpretAsType(t,e,this.options);var g=this.paths[t];if(g.$isSchemaMap){var b=t+".$*",w={type:{}};if(A.hasUserDefinedProperty(e,"of"))w=A.isPOJO(e.of)&&Object.keys(e.of).length>0&&!A.hasUserDefinedProperty(e.of,this.options.typeKey)?new k(e.of):e.of;this.paths[b]=this.interpretAsType(b,w,this.options),g.$__schemaType=this.paths[b]}if(g.$isSingleNested){for(var O in g.schema.paths)this.singleNestedPaths[t+"."+O]=g.schema.paths[O];for(var S in g.schema.singleNestedPaths)this.singleNestedPaths[t+"."+S]=g.schema.singleNestedPaths[S];for(var E in g.schema.subpaths)this.singleNestedPaths[t+"."+E]=g.schema.subpaths[E];Object.defineProperty(g.schema,"base",{configurable:!0,enumerable:!1,writable:!1,value:this.base}),g.caster.base=this.base,this.childSchemas.push({schema:g.schema,model:g.caster})}else g.$isMongooseDocumentArray&&(Object.defineProperty(g.schema,"base",{configurable:!0,enumerable:!1,writable:!1,value:this.base}),g.casterConstructor.base=this.base,this.childSchemas.push({schema:g.schema,model:g.casterConstructor}));if(g.$isMongooseArray&&g.caster instanceof c){for(var $=t,x=g,P=[];x.$isMongooseArray;)$+=".$",x.$isMongooseDocumentArray?(x.$embeddedSchemaType._arrayPath=$,x=x.$embeddedSchemaType.clone()):(x.caster._arrayPath=$,x=x.caster.clone()),x.path=$,P.push(x);var N=!0,T=!1,F=void 0;try{for(var I,L=P[Symbol.iterator]();!(N=(I=L.next()).done);N=!0){var U=I.value;this.subpaths[U.path]=U}}catch(t){T=!0,F=t}finally{try{!N&&L.return&&L.return()}finally{if(T)throw F}}}if(g.$isMongooseDocumentArray){var V=!0,q=!1,W=void 0;try{for(var H,Y=Object.keys(g.schema.paths)[Symbol.iterator]();!(V=(H=Y.next()).done);V=!0){var z=H.value;this.subpaths[t+"."+z]=g.schema.paths[z],g.schema.paths[z].$isUnderneathDocArray=!0}}catch(t){q=!0,W=t}finally{try{!V&&Y.return&&Y.return()}finally{if(q)throw W}}var K=!0,Q=!1,J=void 0;try{for(var G,X=Object.keys(g.schema.subpaths)[Symbol.iterator]();!(K=(G=X.next()).done);K=!0){var Z=G.value;this.subpaths[t+"."+Z]=g.schema.subpaths[Z],g.schema.subpaths[Z].$isUnderneathDocArray=!0}}catch(t){Q=!0,J=t}finally{try{!K&&X.return&&X.return()}finally{if(Q)throw J}}var tt=!0,et=!1,rt=void 0;try{for(var nt,it=Object.keys(g.schema.singleNestedPaths)[Symbol.iterator]();!(tt=(nt=it.next()).done);tt=!0){var ot=nt.value;this.subpaths[t+"."+ot]=g.schema.singleNestedPaths[ot],g.schema.singleNestedPaths[ot].$isUnderneathDocArray=!0}}catch(t){et=!0,rt=t}finally{try{!tt&&it.return&&it.return()}finally{if(et)throw rt}}}return this},Object.defineProperty(k.prototype,"base",{configurable:!0,enumerable:!1,writable:!0,value:null}),k.prototype.interpretAsType=function(t,e,r){if(e instanceof c)return e;var o=null!=this.base?this.base.Schema.Types:k.Types;if(!(A.isPOJO(e)||e instanceof l)&&"Object"!==A.getFunctionName(e.constructor)){var s=e;(e={})[r.typeKey]=s}var a=!e[r.typeKey]||"type"===r.typeKey&&e.type.type?{}:e[r.typeKey],u=void 0;if(A.isPOJO(a)||"mixed"===a)return new o.Mixed(t,e);if(Array.isArray(a)||Array===a||"array"===a){var f=Array===a||"array"===a?e.cast:a[0];if(f&&f.instanceOfSchema)return new o.DocumentArray(t,f,e);if(f&&f[r.typeKey]&&f[r.typeKey].instanceOfSchema)return new o.DocumentArray(t,f[r.typeKey],e,f);if(Array.isArray(f))return new o.Array(t,this.interpretAsType(t,f,r),e);if("string"==typeof f)f=o[f.charAt(0).toUpperCase()+f.substring(1)];else if(f&&(!f[r.typeKey]||"type"===r.typeKey&&f.type.type)&&A.isPOJO(f)){if(Object.keys(f).length){var h={minimize:r.minimize};r.typeKey&&(h.typeKey=r.typeKey),r.hasOwnProperty("strict")&&(h.strict=r.strict),r.hasOwnProperty("typePojoToMixed")&&(h.typePojoToMixed=r.typePojoToMixed);var p=new k(f,h);return p.$implicitlyCreated=!0,new o.DocumentArray(t,p,e)}return new o.Array(t,o.Mixed,e)}if(f&&(u="string"==typeof(a=!f[r.typeKey]||"type"===r.typeKey&&f.type.type?f:f[r.typeKey])?a:a.schemaName||A.getFunctionName(a),!o.hasOwnProperty(u)))throw new TypeError("Invalid schema configuration: `"+u+"` is not a valid type within the array `"+t+"`.See http://bit.ly/mongoose-schematypes for a list of valid schema types.");return new o.Array(t,f||o.Mixed,e,r)}if(a&&a.instanceOfSchema)return new o.Embedded(a,t,e);if((u=n.isBuffer(a)?"Buffer":"function"==typeof a||"object"===(void 0===a?"undefined":i(a))?a.schemaName||A.getFunctionName(a):null==a?""+a:a.toString())&&(u=u.charAt(0).toUpperCase()+u.substring(1)),"ObjectID"===u&&(u="ObjectId"),null==o[u])throw new TypeError("Invalid schema configuration: `"+u+"` is not a valid type at path `"+t+"`. See http://bit.ly/mongoose-schematypes for a list of valid schema types.");return new o[u](t,e)},k.prototype.eachPath=function(t){for(var e=Object.keys(this.paths),r=e.length,n=0;n<r;++n)t(e[n],this.paths[e[n]]);return this},k.prototype.requiredPaths=function(t){if(this._requiredpaths&&!t)return this._requiredpaths;for(var e=Object.keys(this.paths),r=e.length,n=[];r--;){var i=e[r];this.paths[i].isRequired&&n.push(i)}return this._requiredpaths=n,this._requiredpaths},k.prototype.indexedPaths=function(){return this._indexedpaths?this._indexedpaths:(this._indexedpaths=this.indexes(),this._indexedpaths)},k.prototype.pathType=function(t){var e=D(t);return this.paths.hasOwnProperty(t)?"real":this.virtuals.hasOwnProperty(t)?"virtual":this.nested.hasOwnProperty(t)?"nested":this.subpaths.hasOwnProperty(e)||this.subpaths.hasOwnProperty(t)?"real":this.singleNestedPaths.hasOwnProperty(e)||this.singleNestedPaths.hasOwnProperty(t)?"real":null!=M(this,t)?"real":/\.\d+\.|\.\d+$/.test(t)?R(this,t):"adhocOrUndefined"},k.prototype.hasMixedParent=function(t){var e=t.split(/\./g);t="";for(var r=0;r<e.length;++r)if((t=r>0?t+"."+e[r]:e[r])in this.paths&&this.paths[t]instanceof $.Mixed)return this.paths[t];return null},k.prototype.setupTimestamp=function(t){var e=this.childSchemas.find(function(t){return!!t.schema.options.timestamps});if(t||e){var r=g(t,"createdAt"),n=g(t,"updatedAt"),i=null!=t&&t.hasOwnProperty("currentTime")?t.currentTime:null,o={};this.$timestamps={createdAt:r,updatedAt:n},n&&!this.paths[n]&&(o[n]=Date),r&&!this.paths[r]&&(o[r]=Date),this.add(o),this.pre("save",function(t){var e=_(this,"$__.saveOptions.timestamps");if(!1===e)return t();var o=null!=e&&!1===e.updatedAt,s=null!=e&&!1===e.createdAt,a=null!=i?i():(this.ownerDocument?this.ownerDocument():this).constructor.base.now(),u=this._id&&this._id.auto;if(!s&&r&&!this.get(r)&&this.isSelected(r)&&this.set(r,u?this._id.getTimestamp():a),!o&&n&&(this.isNew||this.isModified())){var c=a;this.isNew&&(null!=r?c=this.$__getValue(r):u&&(c=this._id.getTimestamp())),this.set(n,c)}t()}),this.methods.initializeTimestamps=function(){var t=null!=i?i():this.constructor.base.now();return r&&!this.get(r)&&this.set(r,t),n&&!this.get(n)&&this.set(n,t),this},a[S.builtInMiddleware]=!0;var s={query:!0,model:!1};this.pre("findOneAndUpdate",s,a),this.pre("replaceOne",s,a),this.pre("update",s,a),this.pre("updateOne",s,a),this.pre("updateMany",s,a)}function a(t){var e=null!=i?i():this.model.base.now();d(e,r,n,this.getUpdate(),this.options,this.schema),y(e,this.getUpdate(),this.model.schema),t()}},k.prototype.queue=function(t,e){return this.callQueue.push([t,e]),this},k.prototype.pre=function(t){if(t instanceof RegExp){var e=Array.prototype.slice.call(arguments,1),r=!0,n=!1,i=void 0;try{for(var o,s=N[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;t.test(a)&&this.pre.apply(this,[a].concat(e))}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return this}if(Array.isArray(t)){var u=Array.prototype.slice.call(arguments,1),c=!0,l=!1,f=void 0;try{for(var h,p=t[Symbol.iterator]();!(c=(h=p.next()).done);c=!0){var y=h.value;this.pre.apply(this,[y].concat(u))}}catch(t){l=!0,f=t}finally{try{!c&&p.return&&p.return()}finally{if(l)throw f}}return this}return this.s.hooks.pre.apply(this.s.hooks,arguments),this},k.prototype.post=function(t){if(t instanceof RegExp){var e=Array.prototype.slice.call(arguments,1),r=!0,n=!1,i=void 0;try{for(var o,s=N[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;t.test(a)&&this.post.apply(this,[a].concat(e))}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return this}if(Array.isArray(t)){var u=Array.prototype.slice.call(arguments,1),c=!0,l=!1,f=void 0;try{for(var h,p=t[Symbol.iterator]();!(c=(h=p.next()).done);c=!0){var y=h.value;this.post.apply(this,[y].concat(u))}}catch(t){l=!0,f=t}finally{try{!c&&p.return&&p.return()}finally{if(l)throw f}}return this}return this.s.hooks.post.apply(this.s.hooks,arguments),this},k.prototype.plugin=function(t,e){if("function"!=typeof t)throw new Error('First param to `schema.plugin()` must be a function, got "'+(void 0===t?"undefined":i(t))+'"');if(e&&e.deduplicate){var r=!0,n=!1,o=void 0;try{for(var s,a=this.plugins[Symbol.iterator]();!(r=(s=a.next()).done);r=!0){if(s.value.fn===t)return this}}catch(t){n=!0,o=t}finally{try{!r&&a.return&&a.return()}finally{if(n)throw o}}}return this.plugins.push({fn:t,opts:e}),t(this,e),this},k.prototype.method=function(t,e,r){if("string"!=typeof t)for(var n in t)this.methods[n]=t[n],this.methodOptions[n]=A.clone(r);else this.methods[t]=e,this.methodOptions[t]=A.clone(r);return this},k.prototype.static=function(t,e){if("string"!=typeof t)for(var r in t)this.statics[r]=t[r];else this.statics[t]=e;return this},k.prototype.index=function(t,e){return t||(t={}),e||(e={}),e.expires&&A.expires(e),this._indexes.push([t,e]),this},k.prototype.set=function(t,e,r){if(1===arguments.length)return this.options[t];switch(t){case"read":this.options[t]=O(e,r),this._userProvidedOptions[t]=this.options[t];break;case"safe":F(this.options,e),this._userProvidedOptions[t]=this.options[t];break;case"timestamps":this.setupTimestamp(e),this.options[t]=e,this._userProvidedOptions[t]=this.options[t];break;default:this.options[t]=e,this._userProvidedOptions[t]=this.options[t]}return this};
/*!
 * ignore
 */
var F=E.deprecate(function(t,e){t.safe=!1===e?{w:0}:e},"Mongoose: The `safe` option for schemas is deprecated. Use the `writeConcern` option instead: http://bit.ly/mongoose-write-concern");k.prototype.get=function(t){return this.options[t]};var I="2d 2dsphere hashed text".split(" ");
/*!
 * ignore
 */
function L(t,e){var r=e.split("."),n=r.pop(),i=t.tree,o=!0,s=!1,a=void 0;try{for(var u,c=r[Symbol.iterator]();!(o=(u=c.next()).done);o=!0){i=i[u.value]}}catch(t){s=!0,a=t}finally{try{!o&&c.return&&c.return()}finally{if(s)throw a}}delete i[n]}
/*!
 * ignore
 */
function U(t){return t.startsWith("$[")&&t.endsWith("]")}
/*!
 * Module exports.
 */Object.defineProperty(k,"indexTypes",{get:function(){return I},set:function(){throw new Error("Cannot overwrite Schema.indexTypes")}}),k.prototype.indexes=function(){return m(this)},k.prototype.virtual=function(t,e){var r=this;if(t instanceof h)return this.virtual(t.path,t.options);if(e=new f(e),A.hasUserDefinedProperty(e,["ref","refPath"])){if(null==e.localField)throw new Error("Reference virtuals require `localField` option");if(null==e.foreignField)throw new Error("Reference virtuals require `foreignField` option");this.pre("init",function(r){if(w.has(t,r)){var n=w.get(t,r);this.$$populatedVirtuals||(this.$$populatedVirtuals={}),e.justOne||e.count?this.$$populatedVirtuals[t]=Array.isArray(n)?n[0]:n:this.$$populatedVirtuals[t]=Array.isArray(n)?n:null==n?[]:[n],w.unset(t,r)}});var n=this.virtual(t);return n.options=e,n.get(function(e){return this.$$populatedVirtuals&&this.$$populatedVirtuals.hasOwnProperty(t)?this.$$populatedVirtuals[t]:null!=e?e:void 0}).set(function(r){this.$$populatedVirtuals||(this.$$populatedVirtuals={}),e.justOne||e.count?(this.$$populatedVirtuals[t]=Array.isArray(r)?r[0]:r,"object"!==i(this.$$populatedVirtuals[t])&&(this.$$populatedVirtuals[t]=e.count?r:null)):(this.$$populatedVirtuals[t]=Array.isArray(r)?r:null==r?[]:[r],this.$$populatedVirtuals[t]=this.$$populatedVirtuals[t].filter(function(t){return t&&"object"===(void 0===t?"undefined":i(t))}))})}var o=this.virtuals,s=t.split(".");if("real"===this.pathType(t))throw new Error('Virtual path "'+t+'" conflicts with a real path in the schema');o[t]=s.reduce(function(r,n,i){return r[n]||(r[n]=i===s.length-1?new h(e,t):{}),r[n]},this.tree);for(var a=s[0],u=0;u<s.length-1;++u){if(null!=this.paths[a]&&this.paths[a].$isMongooseDocumentArray)if("break"===function(){var t=s.slice(u+1).join(".");return r.paths[a].schema.virtual(t).get(function(e,r,n){var i=n.__parentArray[v],o=a+"."+n.__index+"."+t;return i.get(o)}),"break"}())break;a+="."+s[u+1]}return o[t]},k.prototype.virtualpath=function(t){return this.virtuals.hasOwnProperty(t)?this.virtuals[t]:null},k.prototype.remove=function(t){return"string"==typeof t&&(t=[t]),Array.isArray(t)&&t.forEach(function(t){if(null!=this.path(t)||this.nested[t]){if(this.nested[t]){var e=Object.keys(this.paths).concat(Object.keys(this.nested)),r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;a.startsWith(t+".")&&(delete this.paths[a],delete this.nested[a],L(this,a))}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return delete this.nested[t],void L(this,t)}delete this.paths[t],L(this,t)}},this),this},k.prototype.loadClass=function(t,e){return t===Object.prototype||t===Function.prototype||t.prototype.hasOwnProperty("$isMongooseModelPrototype")?this:(this.loadClass(Object.getPrototypeOf(t)),e||Object.getOwnPropertyNames(t).forEach(function(e){if(!e.match(/^(length|name|prototype)$/)){var r=Object.getOwnPropertyDescriptor(t,e);"function"==typeof r.value&&this.static(e,r.value)}},this),Object.getOwnPropertyNames(t.prototype).forEach(function(r){if(!r.match(/^(constructor)$/)){var n=Object.getOwnPropertyDescriptor(t.prototype,r);e||"function"==typeof n.value&&this.method(r,n.value),"function"==typeof n.get&&this.virtual(r).get(n.get),"function"==typeof n.set&&this.virtual(r).set(n.set)}},this),this)},
/*!
 * ignore
 */
k.prototype._getSchema=function(t){var e=this.path(t),r=[];if(e)return e.$fullPath=t,e;for(var n=t.split("."),i=0;i<n.length;++i)("$"===n[i]||U(n[i]))&&(n[i]="0");return function t(e,n){for(var i=e.length+1,o=void 0,s=void 0;i--;)if(s=e.slice(0,i).join("."),o=n.path(s)){if(r.push(s),o.caster){if(o.caster instanceof $.Mixed)return o.caster.$fullPath=r.join("."),o.caster;if(i!==e.length&&o.schema){var a=void 0;return"$"===e[i]||U(e[i])?i+1===e.length?o:((a=t(e.slice(i+1),o.schema))&&(a.$isUnderneathDocArray=a.$isUnderneathDocArray||!o.schema.$isSingleNested),a):((a=t(e.slice(i),o.schema))&&(a.$isUnderneathDocArray=a.$isUnderneathDocArray||!o.schema.$isSingleNested),a)}}return o.$fullPath=r.join("."),o}}(n,this)},
/*!
 * ignore
 */
k.prototype._getPathType=function(t){if(this.path(t))return"real";return function t(e,r){for(var n=e.length+1,i=void 0,o=void 0;n--;){if(o=e.slice(0,n).join("."),i=r.path(o))return i.caster?i.caster instanceof $.Mixed?{schema:i,pathType:"mixed"}:n!==e.length&&i.schema?"$"===e[n]||U(e[n])?n===e.length-1?{schema:i,pathType:"nested"}:t(e.slice(n+1),i.schema):t(e.slice(n),i.schema):{schema:i,pathType:i.$isSingleNested?"nested":"array"}:{schema:i,pathType:"real"};if(n===e.length&&r.nested[o])return{schema:r,pathType:"nested"}}return{schema:i||r,pathType:"undefined"}}(t.split("."),this)},t.exports=e=k,k.Types=$=r(54),
/*!
 * ignore
 */
e.ObjectId=$.ObjectId}).call(this,r(1).Buffer)},function(t,e,r){"use strict";function n(t,e){this.path=e,this.getters=[],this.setters=[],this.options=Object.assign({},t)}n.prototype._applyDefaultGetters=function(){if(!(this.getters.length>0||this.setters.length>0)){var t="$"+this.path;this.getters.push(function(){return this[t]}),this.setters.push(function(e){this[t]=e})}},
/*!
 * ignore
 */
n.prototype.clone=function(){var t=new n(this.options,this.path);return t.getters=[].concat(this.getters),t.setters=[].concat(this.setters),t},n.prototype.get=function(t){return this.getters.push(t),this},n.prototype.set=function(t){return this.setters.push(t),this},n.prototype.applyGetters=function(t,e){for(var r=t,n=this.getters.length-1;n>=0;n--)r=this.getters[n].call(e,r,this,e);return r},n.prototype.applySetters=function(t,e){for(var r=t,n=this.setters.length-1;n>=0;n--)r=this.setters[n].call(e,r,this,e);return r},
/*!
 * exports
 */
t.exports=n},function(t,e,r){"use strict";
/*!
 * Module exports.
 */e.String=r(144),e.Number=r(77),e.Boolean=r(148),e.DocumentArray=r(149),e.Embedded=r(155),e.Array=r(55),e.Buffer=r(157),e.Date=r(159),e.ObjectId=r(162),e.Mixed=r(31),e.Decimal128=e.Decimal=r(164),e.Map=r(166),e.Oid=e.ObjectId,e.Object=e.Mixed,e.Bool=e.Boolean,e.ObjectID=e.ObjectId},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(48),i=r(71),o=r(16),s=r(150),a=r(7),u=a.CastError,c=r(31),l=r(151),f=r(152),h=r(5),p=r(79),y=r(3),d=r(2),v=r(32).castToNumber,_=r(80),m=r(56),g=void 0,b=void 0,w=Symbol("mongoose#isNestedArray");function O(t,e,n,i){b||(b=r(57).Embedded);var o="type";if(i&&i.typeKey&&(o=i.typeKey),this.schemaOptions=i,e){var s={};d.isPOJO(e)&&(e[o]?(delete(s=d.clone(e))[o],e=e[o]):e=c),e===Object&&(e=c);var u="string"==typeof e?e:d.getFunctionName(e),l=r(54),f=l.hasOwnProperty(u)?l[u]:e;this.casterConstructor=f,this.casterConstructor instanceof O&&(this.casterConstructor[w]=!0),"function"!=typeof f||f.$isArraySubdocument||f.$isSchemaMap?this.caster=f:this.caster=new f(null,s),this.$embeddedSchemaType=this.caster,this.caster instanceof b||(this.caster.path=t)}this.$isMongooseArray=!0,a.call(this,t,n,"Array");var h=void 0,p=void 0;if(null!=this.defaultValue&&(h=this.defaultValue,p="function"==typeof h),!("defaultValue"in this)||void 0!==this.defaultValue){var y=function(){var t=[];return p?t=h.call(this):null!=h&&(t=t.concat(h)),t};y.$runBeforeSetters=!0,this.default(y)}}O.schemaName="Array",O.options={castNonArrays:!0},O.defaultOptions={},O.set=a.set,
/*!
 * Inherits from SchemaType.
 */
O.prototype=Object.create(a.prototype),O.prototype.constructor=O,O.prototype.OptionsConstructor=s,
/*!
 * ignore
 */
O._checkRequired=a.prototype.checkRequired,O.checkRequired=a.checkRequired,O.prototype.checkRequired=function(t,e){return a._isRef(this,t,e,!0)?!!t:("function"==typeof this.constructor.checkRequired?this.constructor.checkRequired():O.checkRequired())(t)},O.prototype.enum=function(){for(var t=this;;){var e=h(t,"caster.instance");if("Array"!==e){if("String"!==e&&"Number"!==e)throw new Error("`enum` can only be set on an array of strings or numbers , not "+e);break}t=t.caster}return t.caster.enum.apply(t.caster,arguments),this},O.prototype.applyGetters=function(t,e){return this.caster.options&&this.caster.options.ref?t:a.prototype.applyGetters.call(this,t,e)},O.prototype._applySetters=function(t,e,r,n){if(this.casterConstructor instanceof O&&O.options.castNonArrays&&!this[w]){for(var i=0,o=this;null!=o&&o instanceof O&&!o.$isMongooseDocumentArray;)++i,o=o.casterConstructor;if(null!=t&&t.length>0){var s=l(t);if(s.min===s.max&&s.max<i)for(var u=s.max;u<i;++u)t=[t]}}return a.prototype._applySetters.call(this,t,e,r,n)},O.prototype.cast=function(t,e,n,i,s){g||(g=r(57).Array);var a=void 0,l=void 0;if(Array.isArray(t)){if(!t.length&&e){var f=e.schema.indexedPaths(),h=this.path;for(a=0,l=f.length;a<l;++a){var p=f[a][0][h];if("2dsphere"===p||"2d"===p)return}var d=this.path.endsWith(".coordinates")?this.path.substr(0,this.path.lastIndexOf(".")):null;if(null!=d)for(a=0,l=f.length;a<l;++a){if("2dsphere"===f[a][0][d])return}}if(t&&t.isMongooseArray?t&&t.isMongooseArray&&(t=new g(t,this.path,e)):t=new g(t,this.path,e),null!=e&&null!=e.$__&&e.populated(this.path))return t;if(this.caster&&this.casterConstructor!==c)try{for(a=0,l=t.length;a<l;a++){if("Number"===this.caster.instance&&void 0===t[a])throw new o("Mongoose number arrays disallow storing undefined");var v={};null!=s&&null!=s.arrayPath?v.arrayPath=s.arrayPath+"."+a:null!=this.caster._arrayPath&&(v.arrayPath=this.caster._arrayPath.slice(0,-2)+"."+a),t[a]=this.caster.cast(t[a],e,n,void 0,v)}}catch(e){throw new u("["+e.kind+"]",y.inspect(t),this.path,e,this)}return t}if(n||O.options.castNonArrays)return e&&n&&e.markModified(this.path),this.cast([t],e,n);throw new u("Array",y.inspect(t),this.path,null,this)},
/*!
 * Ignore
 */
O.prototype.discriminator=function(t,e){for(var r=this;r.$isMongooseArray&&!r.$isMongooseDocumentArray;)if(null==(r=r.casterConstructor)||"function"==typeof r)throw new o("You can only add an embedded discriminator on a document array, "+this.path+" is a plain array");return r.discriminator(t,e)},
/*!
 * ignore
 */
O.prototype.clone=function(){var t=Object.assign({},this.options),e=new this.constructor(this.path,this.caster,t,this.schemaOptions);return e.validators=this.validators.slice(),void 0!==this.requiredValidator&&(e.requiredValidator=this.requiredValidator),e},O.prototype.castForQuery=function(t,e){var r=this,n=void 0,i=void 0;if(2===arguments.length){if(!(n=this.$conditionalHandlers[t]))throw new Error("Can't use "+t+" with Array.");i=n.call(this,e)}else{i=t;var o=this.casterConstructor;if(i&&o.discriminators&&o.schema&&o.schema.options&&o.schema.options.discriminatorKey)if("string"==typeof i[o.schema.options.discriminatorKey]&&o.discriminators[i[o.schema.options.discriminatorKey]])o=o.discriminators[i[o.schema.options.discriminatorKey]];else{var s=m(o,i[o.schema.options.discriminatorKey]);s&&(o=s)}var a=this.casterConstructor.prototype,u=a&&(a.castForQuery||a.cast);!u&&o.castForQuery&&(u=o.castForQuery);var c=this.caster;Array.isArray(i)?(this.setters.reverse().forEach(function(t){i=t.call(r,i,r)}),i=i.map(function(t){return d.isObject(t)&&t.$elemMatch?t:u?t=u.call(c,t):null!=t?t=new o(t):t})):u?i=u.call(c,i):null!=i&&(i=new o(i))}return i};var S=O.prototype.$conditionalHandlers={};S.$all=function(t){return Array.isArray(t)||(t=[t]),t=t.map(function(t){if(d.isObject(t)){var e={};return e[this.path]=t,f(this.casterConstructor.schema,e)[this.path]}return t},this),this.castForQuery(t)},S.$options=String,S.$elemMatch=function(t){for(var e=Object.keys(t),r=e.length,n=0;n<r;++n){var i=e[n],o=t[i];p(i)&&null!=o&&(t[i]=this.castForQuery(i,o))}var s=h(this,"casterConstructor.schema.options.discriminatorKey"),a=h(this,"casterConstructor.schema.discriminators",{});return null!=s&&null!=t[s]&&null!=a[t[s]]?f(a[t[s]],t):f(this.casterConstructor.schema,t)},S.$geoIntersects=_.cast$geoIntersects,S.$or=S.$and=function(t){if(!Array.isArray(t))throw new TypeError("conditional $or/$and require array");var e=[],r=!0,n=!1,i=void 0;try{for(var o,s=t[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;e.push(f(this.casterConstructor.schema,a))}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return e},S.$near=S.$nearSphere=_.cast$near,S.$within=S.$geoWithin=_.cast$within,S.$size=S.$minDistance=S.$maxDistance=v,S.$exists=n,S.$type=i,S.$eq=S.$gt=S.$gte=S.$lt=S.$lte=S.$ne=S.$regex=O.prototype.castForQuery,S.$nin=a.prototype.$conditionalHandlers.$nin,S.$in=a.prototype.$conditionalHandlers.$in,
/*!
 * Module exports.
 */
t.exports=O},function(t,e,r){"use strict";
/*!
* returns discriminator by discriminatorMapping.value
*
* @param {Model} model
* @param {string} value
*/t.exports=function(t,e){var r=null;if(!t.discriminators)return r;for(var n in t.discriminators){var i=t.discriminators[n];if(i.schema&&i.schema.discriminatorMapping&&i.schema.discriminatorMapping.value==e){r=i;break}}return r}},function(t,e,r){"use strict";
/*!
 * Module exports.
 */e.Array=r(81),e.Buffer=r(84),e.Document=e.Embedded=r(25),e.DocumentArray=r(17),e.Decimal128=r(19),e.ObjectId=r(13),e.Map=r(86),e.Subdocument=r(88)},function(t,e,r){"use strict";var n=r(0).documentSchemaSymbol,i=r(5),o=r(2),s=void 0,a=r(0).getSymbol,u=r(0).scopeSymbol;
/*!
 * Compiles schemas.
 */
function c(t,e,n,i){s=s||r(6);for(var a=Object.keys(t),u=a.length,c=void 0,f=void 0,h=0;h<u;++h){c=t[f=a[h]],l(f,o.isPOJO(c)&&Object.keys(c).length&&(!c[i.typeKey]||"type"===i.typeKey&&c.type.type)?c:null,e,n,a,i)}}
/*!
 * Defines the accessor named prop on the incoming prototype.
 */function l(t,e,l,f,h,p){s=s||r(6);var y=(f?f+".":"")+t;f=f||"",e?Object.defineProperty(l,t,{enumerable:!0,configurable:!0,get:function(){var t=this;if(this.$__.getters||(this.$__.getters={}),!this.$__.getters[y]){var r=Object.create(s.prototype,function(t){var e={};return Object.getOwnPropertyNames(t).forEach(function(r){e[r]=Object.getOwnPropertyDescriptor(t,r),e[r].get?delete e[r]:e[r].enumerable=-1===["isNew","$__","errors","_doc","$locals","$op","__parentArray","__index","$isDocumentArrayElement"].indexOf(r)}),e}(this));f||(r.$__[u]=this),r.$__.nestedPath=y,Object.defineProperty(r,"schema",{enumerable:!1,configurable:!0,writable:!1,value:l.schema}),Object.defineProperty(r,n,{enumerable:!1,configurable:!0,writable:!1,value:l.schema}),Object.defineProperty(r,"toObject",{enumerable:!1,configurable:!0,writable:!1,value:function(){return o.clone(t.get(y,null,{virtuals:i(this,"schema.options.toObject.virtuals",null)}))}}),Object.defineProperty(r,"toJSON",{enumerable:!1,configurable:!0,writable:!1,value:function(){return t.get(y,null,{virtuals:i(t,"schema.options.toJSON.virtuals",null)})}}),Object.defineProperty(r,"$__isNested",{enumerable:!1,configurable:!0,writable:!1,value:!0});var a=Object.freeze({minimize:!0,virtuals:!1,getters:!1,transform:!1});Object.defineProperty(r,"$isEmpty",{enumerable:!1,configurable:!0,writable:!1,value:function(){return 0===Object.keys(this.get(y,null,a)||{}).length}}),c(e,r,y,p),this.$__.getters[y]=r}return this.$__.getters[y]},set:function(t){t instanceof s&&(t=t.toObject({transform:!1})),(this.$__[u]||this).$set(y,t)}}):Object.defineProperty(l,t,{enumerable:!0,configurable:!0,get:function(){return this[a].call(this.$__[u]||this,y)},set:function(t){this.$set.call(this.$__[u]||this,y,t)}})}
/*!
 * exports
 */
e.compile=c,e.defineKey=l},function(t,e,r){"use strict";(function(e){if(void 0!==e.Map)t.exports=e.Map,t.exports.Map=e.Map;else{var r=function(t){this._keys=[],this._values={};for(var e=0;e<t.length;e++)if(null!=t[e]){var r=t[e],n=r[0],i=r[1];this._keys.push(n),this._values[n]={v:i,i:this._keys.length-1}}};r.prototype.clear=function(){this._keys=[],this._values={}},r.prototype.delete=function(t){var e=this._values[t];return null!=e&&(delete this._values[t],this._keys.splice(e.i,1),!0)},r.prototype.entries=function(){var t=this,e=0;return{next:function(){var r=t._keys[e++];return{value:void 0!==r?[r,t._values[r].v]:void 0,done:void 0===r}}}},r.prototype.forEach=function(t,e){e=e||this;for(var r=0;r<this._keys.length;r++){var n=this._keys[r];t.call(e,this._values[n].v,n,e)}},r.prototype.get=function(t){return this._values[t]?this._values[t].v:void 0},r.prototype.has=function(t){return null!=this._values[t]},r.prototype.keys=function(){var t=this,e=0;return{next:function(){var r=t._keys[e++];return{value:void 0!==r?r:void 0,done:void 0===r}}}},r.prototype.set=function(t,e){return this._values[t]?(this._values[t].v=e,this):(this._keys.push(t),this._values[t]={v:e,i:this._keys.length-1},this)},r.prototype.values=function(){var t=this,e=0;return{next:function(){var r=t._keys[e++];return{value:void 0!==r?t._values[r].v:void 0,done:void 0===r}}}},Object.defineProperty(r.prototype,"size",{enumerable:!0,get:function(){return this._keys.length}}),t.exports=r,t.exports.Map=r}}).call(this,r(11))},function(t,e,r){"use strict";var n=function t(e){if(!(this instanceof t))return new t(e);this._bsontype="Int32",this.value=e};n.prototype.valueOf=function(){return this.value},n.prototype.toJSON=function(){return this.value},t.exports=n,t.exports.Int32=n},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(6),i=r(172),o=!1;t.exports=function(){return o?i:n},
/*!
 * ignore
 */
t.exports.setBrowser=function(t){o=t}},function(t,e,r){"use strict";t.exports=function(t,e,r){var n=[],i=t.length;if(0===i)return n;var o=e<0?Math.max(0,e+i):e||0;for(void 0!==r&&(i=r<0?r+i:r);i-- >o;)n[i-o]=t[i];return n}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=Object.prototype.toString;t.exports=function(t){if(!function(t){return"object"==(void 0===t?"undefined":n(t))&&"[object RegExp]"==i.call(t)}(t))throw new TypeError("Not a RegExp");var e=[];t.global&&e.push("g"),t.multiline&&e.push("m"),t.ignoreCase&&e.push("i"),t.dotAll&&e.push("s"),t.unicode&&e.push("u"),t.sticky&&e.push("y");var r=new RegExp(t.source,e.join(""));return"number"==typeof t.lastIndex&&(r.lastIndex=t.lastIndex),r}},function(t,e,r){"use strict";t.exports=function(t){return t.name?t.name:(t.toString().trim().match(/^function\s*([^\s(]+)/)||[])[1]}},function(t,e,r){"use strict";var n=r(5);
/*!
 * Get the bson type, if it exists
 */t.exports=function(t,e){return n(t,"_bsontype",void 0)===e}},function(t,e,r){"use strict";(function(e){
/*!
 * ignore
 */
var n=r(21),i=r(115),o={_promise:null,get:function(){return o._promise},set:function(t){n.ok("function"==typeof t,"mongoose.Promise must be a function, got "+t),o._promise=t,i.Promise=t}};
/*!
 * Use native promises by default
 */
o.set(e.Promise),t.exports=o}).call(this,r(11))},function(t,e,r){"use strict";(function(t,n){
/*!
 * Module dependencies.
 */
var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},o=r(45).Buffer,s=r(63),a=e.clone=function t(r,n){if(void 0===r||null===r)return r;if(Array.isArray(r))return e.cloneArray(r,n);if(r.constructor){if(/ObjectI[dD]$/.test(r.constructor.name))return"function"==typeof r.clone?r.clone():new r.constructor(r.id);if("ReadPreference"===r.constructor.name)return new r.constructor(r.mode,t(r.tags,n));if("Binary"==r._bsontype&&r.buffer&&r.value)return"function"==typeof r.clone?r.clone():new r.constructor(r.value(!0),r.sub_type);if("Date"===r.constructor.name||"Function"===r.constructor.name)return new r.constructor(+r);if("RegExp"===r.constructor.name)return s(r);if("Buffer"===r.constructor.name)return e.cloneBuffer(r)}return c(r)?e.cloneObject(r,n):r.valueOf?r.valueOf():void 0};
/*!
 * ignore
 */
e.cloneObject=function(t,e){var r,n,i,o=e&&e.minimize,s={};for(i in t)n=a(t[i],e),o&&void 0===n||(r||(r=!0),s[i]=n);return o?r&&s:s},e.cloneArray=function(t,e){for(var r=[],n=0,i=t.length;n<i;n++)r.push(a(t[n],e));return r},e.tick=function(t){if("function"==typeof t)return function(){var e=arguments;l(function(){t.apply(this,e)})}},e.merge=function t(r,n){for(var i,o=Object.keys(n),s=o.length;s--;)void 0===r[i=o[s]]?r[i]=n[i]:e.isObject(n[i])?t(r[i],n[i]):r[i]=n[i]},e.mergeClone=function t(r,n){for(var i,o=Object.keys(n),s=o.length;s--;)void 0===r[i=o[s]]?r[i]=a(n[i]):e.isObject(n[i])?t(r[i],n[i]):r[i]=a(n[i])},e.readPref=function(t){switch(t){case"p":t="primary";break;case"pp":t="primaryPreferred";break;case"s":t="secondary";break;case"sp":t="secondaryPreferred";break;case"n":t="nearest"}return t},e.readConcern=function(t){if("string"==typeof t){switch(t){case"l":t="local";break;case"a":t="available";break;case"m":t="majority";break;case"lz":t="linearizable";break;case"s":t="snapshot"}t={level:t}}return t};var u=Object.prototype.toString;e.toString=function(t){return u.call(t)};var c=e.isObject=function(t){return"[object Object]"==e.toString(t)};e.isArray=function(t){return Array.isArray(t)||"object"==(void 0===t?"undefined":i(t))&&"[object Array]"==e.toString(t)},e.keys=Object.keys||function(t){var e=[];for(var r in t)t.hasOwnProperty(r)&&e.push(r);return e},e.create="function"==typeof Object.create?Object.create:function(t){if(arguments.length>1)throw new Error("Adding properties is not supported");function e(){}return e.prototype=t,new e},e.inherits=function(t,r){t.prototype=e.create(r.prototype),t.prototype.constructor=t};var l=e.soon="function"==typeof t?t:n.nextTick;e.cloneBuffer=function(t){var e=o.alloc(t.length);return t.copy(e,0,0,t.length),e},e.isArgumentsObject=function(t){return"[object Arguments]"===Object.prototype.toString.call(t)}}).call(this,r(68).setImmediate,r(8))},function(t,e,r){"use strict";(function(t){var n=void 0!==t&&t||"undefined"!=typeof self&&self||window,i=Function.prototype.apply;function o(t,e){this._id=t,this._clearFn=e}e.setTimeout=function(){return new o(i.call(setTimeout,n,arguments),clearTimeout)},e.setInterval=function(){return new o(i.call(setInterval,n,arguments),clearInterval)},e.clearTimeout=e.clearInterval=function(t){t&&t.close()},o.prototype.unref=o.prototype.ref=function(){},o.prototype.close=function(){this._clearFn.call(n,this._id)},e.enroll=function(t,e){clearTimeout(t._idleTimeoutId),t._idleTimeout=e},e.unenroll=function(t){clearTimeout(t._idleTimeoutId),t._idleTimeout=-1},e._unrefActive=e.active=function(t){clearTimeout(t._idleTimeoutId);var e=t._idleTimeout;e>=0&&(t._idleTimeoutId=setTimeout(function(){t._onTimeout&&t._onTimeout()},e))},r(116),e.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==t&&t.setImmediate||void 0,e.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==t&&t.clearImmediate||void 0}).call(this,r(11))},function(t,e,r){"use strict";(function(t,r,n,i){var o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};e.isNode=void 0!==t&&"object"==o(r)&&"object"==(void 0===n?"undefined":o(n))&&"function"==typeof i&&t.argv,e.isMongo=!e.isNode&&"function"==typeof printjson&&"function"==typeof ObjectId&&"function"==typeof rs&&"function"==typeof sh,e.isBrowser=!e.isNode&&!e.isMongo&&"undefined"!=typeof window,e.type=e.isNode?"node":e.isMongo?"mongo":e.isBrowser?"browser":"unknown"}).call(this,r(8),r(121)(t),r(11),r(1).Buffer)},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}();var i=r(4),o=function(t){function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var r=t.message;r||(r=i.messages.general.default);var n=s(r,t),o=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n));return t=Object.assign({},t,{message:n}),o.properties=t,o.kind=t.type,o.path=t.path,o.value=t.value,o.reason=t.reason,o}
/*!
   * toString helper
   * TODO remove? This defaults to `${this.name}: ${this.message}`
   */return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,i),n(e,[{key:"toString",value:function(){return this.message}}]),e}();
/*!
 * Formats error messages
 */
function s(t,e){if("function"==typeof t)return t(e);var r=Object.keys(e),n=!0,i=!1,o=void 0;try{for(var s,a=r[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var u=s.value;"message"!==u&&(t=t.replace("{"+u.toUpperCase()+"}",e[u]))}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}return t}
/*!
 * exports
 */Object.defineProperty(o.prototype,"name",{value:"ValidatorError"}),
/*!
 * The object used to define this validator. Not enumerable to hide
 * it from `require('util').inspect()` output re: gh-3925
 */
Object.defineProperty(o.prototype,"properties",{enumerable:!1,writable:!0,value:null}),o.prototype.formatMessage=s,t.exports=o},function(t,e,r){"use strict";
/*!
 * ignore
 */t.exports=function(t){if("number"!=typeof t&&"string"!=typeof t)throw new Error("$type parameter must be number or string");return t}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){function e(t,r){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var n=Array.isArray(r)?"array":"primitive value",i=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,"Tried to set nested object field `"+t+"` to "+n+" `"+r+"` and strict mode is set to throw."));return i.path=t,i}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"ObjectExpectedError"}),t.exports=i},function(t,e,r){"use strict";t.exports=function(t){var e={_id:{auto:!0}};e._id[t.options.typeKey]="ObjectId",t.add(e)}},function(t,e,r){"use strict";t.exports=
/*!
 * ignore
 */
function(t,e){if(null==t)return null;if("boolean"==typeof t)return e;if("boolean"==typeof t[e])return t[e]?e:null;if(!(e in t))return e;return t[e]}},function(t,e,r){"use strict";var n=r(51),i=r(24);
/*!
 * Register hooks for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */
function o(t,e,r){var s={useErrorHandlers:!0,numCallbackParams:1,nullResultByDefault:!0,contextParameter:!0},a=(r=r||{}).decorateDoc?t:t.prototype;t.$appliedHooks=!0;var u=!0,c=!1,l=void 0;try{for(var f,h=Object.keys(e.paths)[Symbol.iterator]();!(u=(f=h.next()).done);u=!0){var p=f.value,y=e.paths[p],d=null;if(y.$isSingleNested)d=y.caster;else{if(!y.$isMongooseDocumentArray)continue;d=y.Constructor}if(!d.$appliedHooks&&(o(d,y.schema,r),null!=d.discriminators)){var v=Object.keys(d.discriminators),_=!0,m=!1,g=void 0;try{for(var b,w=v[Symbol.iterator]();!(_=(b=w.next()).done);_=!0){var O=b.value;o(d.discriminators[O],d.discriminators[O].schema,r)}}catch(t){m=!0,g=t}finally{try{!_&&w.return&&w.return()}finally{if(m)throw g}}}}}catch(t){c=!0,l=t}finally{try{!u&&h.return&&h.return()}finally{if(c)throw l}}var S=e.s.hooks.filter(function(t){return"updateOne"===t.name||"deleteOne"===t.name?!!t.document:"remove"!==t.name||(null==t.document||!!t.document)}).filter(function(t){return!e.methods[t.name]||!t.fn[n.builtInMiddleware]});t._middleware=S,a.$__originalValidate=a.$__originalValidate||a.$__validate;for(var E=["save","validate","remove","deleteOne"],A=0;A<E.length;A++){var j=E[A],$="validate"===j?"$__originalValidate":"$__"+j,x=S.createWrapper(j,a[$],null,s);a["$__"+j]=x}a.$__init=S.createWrapperSync("init",a.$__init,null,s);var P=Object.keys(e.methods),N=Object.assign({},s,{checkForPromise:!0}),T=!0,k=!1,B=void 0;try{for(var C,D=function(){var e=C.value;if(!S.hasHooks(e))return"continue";var r=a[e];a[e]=function(){var r=this,n=Array.prototype.slice.call(arguments),o=n.slice(-1).pop(),s="function"==typeof o?n.slice(0,n.length-1):n;return i(o,function(t){return r["$__"+e].apply(r,s.concat([t]))},t.events)},a["$__"+e]=S.createWrapper(e,r,null,N)},M=P[Symbol.iterator]();!(T=(C=M.next()).done);T=!0)D()}catch(t){k=!0,B=t}finally{try{!T&&M.return&&M.return()}finally{if(k)throw B}}}
/*!
 * ignore
 */
t.exports=o,
/*!
 * ignore
 */
o.middlewareFunctions=["deleteOne","save","validate","remove","updateOne","init"]},function(t,e,r){"use strict";var n=r(12);
/*!
 * Given a value, cast it to a string, or throw a `CastError` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @param {String} [path] optional the path to set on the CastError
 * @return {string|null|undefined}
 * @throws {CastError}
 * @api private
 */t.exports=function(t,e){if(null==t)return t;if(t._id&&"string"==typeof t._id)return t._id;if(t.toString&&t.toString!==Object.prototype.toString&&!Array.isArray(t))return t.toString();throw new n("string",t,e)}},function(t,e,r){"use strict";(function(e){
/*!
 * Module requirements.
 */
var n=r(4),i=r(146),o=r(7),s=r(147),a=r(78),u=r(2),c=r(0).populateModelSymbol,l=o.CastError,f=void 0;function h(t,e){o.call(this,t,e,"Number")}
/*!
 * ignore
 */
function p(t){return this.cast(t)}h.get=o.get,h.set=o.set,
/*!
 * ignore
 */
h._cast=s,h.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){if("number"!=typeof t)throw new Error;return t}),this._cast=t,this._cast)},h.schemaName="Number",h.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
h.prototype=Object.create(o.prototype),h.prototype.constructor=h,h.prototype.OptionsConstructor=i,
/*!
 * ignore
 */
h._checkRequired=function(t){return"number"==typeof t||t instanceof Number},h.checkRequired=o.checkRequired,h.prototype.checkRequired=function(t,e){return o._isRef(this,t,e,!0)?!!t:("function"==typeof this.constructor.checkRequired?this.constructor.checkRequired():h.checkRequired())(t)},h.prototype.min=function(t,e){if(this.minValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.minValidator},this)),null!==t&&void 0!==t){var r=e||n.messages.Number.min;r=r.replace(/{MIN}/,t),this.validators.push({validator:this.minValidator=function(e){return null==e||e>=t},message:r,type:"min",min:t})}return this},h.prototype.max=function(t,e){if(this.maxValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.maxValidator},this)),null!==t&&void 0!==t){var r=e||n.messages.Number.max;r=r.replace(/{MAX}/,t),this.validators.push({validator:this.maxValidator=function(e){return null==e||e<=t},message:r,type:"max",max:t})}return this},h.prototype.enum=function(t,e){return this.enumValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.enumValidator},this)),Array.isArray(t)||(t=Array.prototype.slice.call(arguments),e=n.messages.Number.enum),e=null==e?n.messages.Number.enum:e,this.enumValidator=function(e){return null==e||-1!==t.indexOf(e)},this.validators.push({validator:this.enumValidator,message:e,type:"enum",enumValues:t}),this},h.prototype.cast=function(t,n,i){if(o._isRef(this,t,n,i)){if(null===t||void 0===t)return t;if(f||(f=r(6)),t instanceof f)return t.$__.wasPopulated=!0,t;if("number"==typeof t)return t;if(e.isBuffer(t)||!u.isObject(t))throw new l("Number",t,this.path,null,this);var s=n.$__fullPath(this.path),a=new((n.ownerDocument?n.ownerDocument():n).populated(s,!0).options[c])(t);return a.$__.wasPopulated=!0,a}var p=t&&void 0!==t._id?t._id:t,y="function"==typeof this.constructor.cast?this.constructor.cast():h.cast();try{return y(p)}catch(t){throw new l("Number",p,this.path,t,this)}},h.prototype.$conditionalHandlers=u.options(o.prototype.$conditionalHandlers,{$bitsAllClear:a,$bitsAnyClear:a,$bitsAllSet:a,$bitsAnySet:a,$gt:p,$gte:p,$lt:p,$lte:p,$mod:function(t){var e=this;return Array.isArray(t)?t.map(function(t){return e.cast(t)}):[this.cast(t)]}}),h.prototype.castForQuery=function(t,e){var r=void 0;if(2===arguments.length){if(!(r=this.$conditionalHandlers[t]))throw new l("number",e,this.path,null,this);return r.call(this,e)}return e=this._castForQuery(t)},
/*!
 * Module exports.
 */
t.exports=h}).call(this,r(1).Buffer)},function(t,e,r){"use strict";(function(e){
/*!
 * Module requirements.
 */
var n=r(12);
/*!
 * ignore
 */
/*!
 * ignore
 */
function i(t,e){var r=Number(e);if(isNaN(r))throw new n("number",e,t);return r}t.exports=function(t){var r=this;return Array.isArray(t)?t.map(function(t){return i(r.path,t)}):e.isBuffer(t)?t:i(r.path,t)}}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n=new Set(["$ref","$id","$db"]);t.exports=function(t){return t.startsWith("$")&&!n.has(t)}},function(t,e,r){"use strict";
/*!
 * Module requirements.
 */var n=r(32).castArraysOfNumbers,i=r(32).castToNumber;function o(t,e){switch(t.$geometry.type){case"Polygon":case"LineString":case"Point":n(t.$geometry.coordinates,e)}return s(e,t),t}function s(t,e){e.$maxDistance&&(e.$maxDistance=i.call(t,e.$maxDistance)),e.$minDistance&&(e.$minDistance=i.call(t,e.$minDistance))}
/*!
 * ignore
 */
e.cast$geoIntersects=function(t){if(!t.$geometry)return;return o(t,this),t},e.cast$near=function(t){var e=r(55);if(Array.isArray(t))return n(t,this),t;if(s(this,t),t&&t.$geometry)return o(t,this);if(!Array.isArray(t))throw new TypeError("$near must be either an array or an object with a $geometry property");return e.prototype.castForQuery.call(this,t)},e.cast$within=function(t){var e=this;if(s(this,t),t.$box||t.$polygon){var r=t.$box?"$box":"$polygon";t[r].forEach(function(t){if(!Array.isArray(t)){var r="Invalid $within $box argument. Expected an array, received "+t;throw new TypeError(r)}t.forEach(function(r,n){t[n]=i.call(e,r)})})}else if(t.$center||t.$centerSphere){var n=t.$center?"$center":"$centerSphere";t[n].forEach(function(r,o){Array.isArray(r)?r.forEach(function(t,n){r[n]=i.call(e,t)}):t[n][o]=i.call(e,r)})}else t.$geometry&&o(t,this);return t}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(82),i=r(6),o=r(0).arrayAtomicsSymbol,s=r(0).arrayParentSymbol,a=r(0).arrayPathSymbol,u=r(0).arraySchemaSymbol,c=Array.prototype.push;
/*!
 * Module exports.
 */
t.exports=function(t,e,r){var l=new n;if(l[o]={},Array.isArray(t)){for(var f=t.length,h=0;h<f;++h)c.call(l,t[h]);l[o]=t[o]||{}}return l[a]=e,l[u]=void 0,r&&r instanceof i&&(l[s]=r,l[u]=r.schema.path(e)),l}},function(t,e,r){"use strict";(function(e){var n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}();var i=r(6),o=r(25),s=r(16),a=r(13),u=r(83),c=r(5),l=r(22).internalToObjectOptions,f=r(2),h=r(3),p=r(0).arrayAtomicsSymbol,y=r(0).arrayParentSymbol,d=r(0).arrayPathSymbol,v=r(0).arraySchemaSymbol,_=r(0).populateModelSymbol,m=Symbol("mongoose#Array#sliced"),g=Array.prototype.push,b=Symbol("mongoose#MongooseCoreArray#validators"),w=function(t){function r(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,r),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(r.__proto__||Object.getPrototypeOf(r)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(r,Array),n(r,[{key:"$__getAtomics",value:function(){var t=[],e=Object.keys(this[p]),r=e.length,n=Object.assign({},l,{_isNested:!0});if(0===r)return t[0]=["$set",this.toObject(n)],t;for(;r--;){var i=e[r],o=this[p][i];f.isMongooseObject(o)?o=o.toObject(n):Array.isArray(o)?o=this.toObject.call(o,n):null!=o&&Array.isArray(o.$each)?o.$each=this.toObject.call(o.$each,n):null!=o&&"function"==typeof o.valueOf&&(o=o.valueOf()),"$addToSet"===i&&(o={$each:o}),t.push([i,o])}return t}
/*!
     * ignore
     */},{key:"$atomics",value:function(){return this[p]}
/*!
     * ignore
     */},{key:"$parent",value:function(){return this[y]}
/*!
     * ignore
     */},{key:"$path",value:function(){return this[d]}},{key:"$shift",value:function(){if(this._registerAtomic("$pop",-1),this._markModified(),!this._shifted)return this._shifted=!0,[].shift.call(this)}},{key:"$pop",value:function(){if(this._registerAtomic("$pop",1),this._markModified(),!this._popped)return this._popped=!0,[].pop.call(this)}
/*!
     * ignore
     */},{key:"$schema",value:function(){return this[v]}},{key:"_cast",value:function(t){var r=!1,n=void 0;return this[y]&&(r=this[y].populated(this[d],!0)),r&&null!==t&&void 0!==t?(n=r.options[_],(e.isBuffer(t)||t instanceof a||!f.isObject(t))&&(t={_id:t}),t.schema&&t.schema.discriminatorMapping&&void 0!==t.schema.discriminatorMapping.key||(t=new n(t)),this[v].caster.applySetters(t,this[y],!0)):this[v].caster.applySetters(t,this[y],!1)}},{key:"_mapCast",value:function(t,e){return this._cast(t,this.length+e)}},{key:"_markModified",value:function(t,e){var r=this[y],n=void 0;if(r){if(n=this[d],arguments.length&&(n=null!=e?n+"."+this.indexOf(t)+"."+e:n+"."+t),null!=n&&n.endsWith(".$"))return this;r.markModified(n,arguments.length>0?t:r)}return this}},{key:"_registerAtomic",value:function(t,e){if(!this[m]){if("$set"===t)return this[p]={$set:e},u(this[y],this[d]),this._markModified(),this;var r=this[p];if("$pop"===t&&!("$pop"in r)){var n=this;this[y].once("save",function(){n._popped=n._shifted=null})}if(this[p].$set||Object.keys(r).length&&!(t in r))return this[p]={$set:this},this;var i=void 0;if("$pullAll"===t||"$addToSet"===t)r[t]||(r[t]=[]),r[t]=r[t].concat(e);else if("$pullDocs"===t){var s=r.$pull||(r.$pull={});e[0]instanceof o?(i=s.$or||(s.$or=[]),Array.prototype.push.apply(i,e.map(function(t){return t.toObject({transform:!1,virtuals:!1})}))):(i=s._id||(s._id={$in:[]})).$in=i.$in.concat(e)}else"$push"===t?(r.$push=r.$push||{$each:[]},null!=e&&f.hasUserDefinedProperty(e,"$each")?r.$push=e:r.$push.$each=r.$push.$each.concat(e)):r[t]=e;return this}}},{key:"addToSet",value:function(){O(this,arguments);var t=[].map.call(arguments,this._mapCast,this),e=[],r="";return(t=this[v].applySetters(t,this[y]))[0]instanceof o?r="doc":t[0]instanceof Date&&(r="date"),t.forEach(function(t){var n=void 0,i=+t;switch(r){case"doc":n=this.some(function(e){return e.equals(t)});break;case"date":n=this.some(function(t){return+t===i});break;default:n=~this.indexOf(t)}n||([].push.call(this,t),this._registerAtomic("$addToSet",t),this._markModified(),[].push.call(e,t))},this),e}},{key:"hasAtomics",value:function(){return f.isPOJO(this[p])?Object.keys(this[p]).length:0}},{key:"includes",value:function(t,e){return-1!==this.indexOf(t,e)}},{key:"indexOf",value:function(t,e){t instanceof a&&(t=t.toString()),e=null==e?0:e;for(var r=this.length,n=e;n<r;++n)if(t==this[n])return n;return-1}},{key:"inspect",value:function(){return JSON.stringify(this)}},{key:"nonAtomicPush",value:function(){var t=[].map.call(arguments,this._mapCast,this),e=[].push.apply(this,t);return this._registerAtomic("$set",this),this._markModified(),e}},{key:"pop",value:function(){var t=[].pop.call(this);return this._registerAtomic("$set",this),this._markModified(),t}},{key:"pull",value:function(){for(var t=[].map.call(arguments,this._cast,this),e=this[y].get(this[d]),r=e.length,n=void 0;r--;){if((n=e[r])instanceof i)t.some(function(t){return n.equals(t)})&&[].splice.call(e,r,1);else~e.indexOf.call(t,n)&&[].splice.call(e,r,1)}return t[0]instanceof o?this._registerAtomic("$pullDocs",t.map(function(t){return t._id||t})):this._registerAtomic("$pullAll",t),this._markModified(),u(this[y],this[d])>0&&this._registerAtomic("$set",this),this}},{key:"push",value:function(){var t=arguments,e=t,r=null!=t[0]&&f.hasUserDefinedProperty(t[0],"$each");if(r&&(e=t[0],t=t[0].$each),null==this[v])return g.apply(this,t);O(this,t);var n=this[y];t=[].map.call(t,this._mapCast,this),t=this[v].applySetters(t,n,void 0,void 0,{skipDocumentArrayCast:!0});var i=void 0,o=this[p];if(r){if(e.$each=t,c(o,"$push.$each.length",0)>0&&o.$push.$position!=o.$position)throw new s("Cannot call `Array#push()` multiple times with different `$position`");null!=e.$position?([].splice.apply(this,[e.$position,0].concat(t)),i=this.length):i=[].push.apply(this,t)}else{if(c(o,"$push.$each.length",0)>0&&null!=o.$push.$position)throw new s("Cannot call `Array#push()` multiple times with different `$position`");e=t,i=[].push.apply(this,t)}return this._registerAtomic("$push",e),this._markModified(),i}},{key:"remove",value:function(){return this.pull.apply(this,arguments)}},{key:"set",value:function(t,e){var r=this._cast(e,t);return this[t]=r,this._markModified(t),this}},{key:"shift",value:function(){var t=[].shift.call(this);return this._registerAtomic("$set",this),this._markModified(),t}},{key:"sort",value:function(){var t=[].sort.apply(this,arguments);return this._registerAtomic("$set",this),t}},{key:"splice",value:function(){var t=void 0;if(O(this,Array.prototype.slice.call(arguments,2)),arguments.length){var e=void 0;if(null==this[v])e=arguments;else{e=[];for(var r=0;r<arguments.length;++r)e[r]=r<2?arguments[r]:this._cast(arguments[r],arguments[0]+(r-2))}t=[].splice.apply(this,e),this._registerAtomic("$set",this)}return t}
/*!
     * ignore
     */},{key:"slice",value:function(){var t=function t(e,r,n){null===e&&(e=Function.prototype);var i=Object.getOwnPropertyDescriptor(e,r);if(void 0===i){var o=Object.getPrototypeOf(e);return null===o?void 0:t(o,r,n)}if("value"in i)return i.value;var s=i.get;return void 0!==s?s.call(n):void 0}(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"slice",this).apply(this,arguments);return t[y]=this[y],t[v]=this[v],t[p]=this[p],t[m]=!0,t}
/*!
     * ignore
     */},{key:"toBSON",value:function(){return this.toObject(l)}},{key:"toObject",value:function(t){return t&&t.depopulate?((t=f.clone(t))._isNested=!0,this.map(function(e){return e instanceof i?e.toObject(t):e})):this.slice()}},{key:"unshift",value:function(){O(this,arguments);var t=void 0;return null==this[v]?t=arguments:(t=[].map.call(arguments,this._cast,this),t=this[v].applySetters(t,this[y])),[].unshift.apply(this,t),this._registerAtomic("$set",this),this._markModified(),this.length}},{key:"isMongooseArray",get:function(){return!0}},{key:"validators",get:function(){return this[b]},set:function(t){this[b]=t}}]),r}();
/*!
 * ignore
 */
function O(t,e){var r=null==t?null:c(t[v],"caster.options.ref",null);0===t.length&&e.length>0&&
/*!
 * ignore
 */
function(t,e){if(!e)return!1;var r=!0,n=!1,o=void 0;try{for(var s,a=t[Symbol.iterator]();!(r=(s=a.next()).done);r=!0){var u=s.value;if(null==u)return!1;var c=u.constructor;if(!(u instanceof i)||c.modelName!==e&&c.baseModelName!==e)return!1}}catch(t){n=!0,o=t}finally{try{!r&&a.return&&a.return()}finally{if(n)throw o}}return!0}(e,r)&&t[y].populated(t[d],[],function(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}({},_,e[0].constructor))}h.inspect.custom&&(w.prototype[h.inspect.custom]=w.prototype.inspect),t.exports=w}).call(this,r(1).Buffer)},function(t,e,r){"use strict";
/*!
 * ignore
 */t.exports=function(t,e,r){var n=(r=r||{}).skipDocArrays,i=0;if(!t)return i;var o=!0,s=!1,a=void 0;try{for(var u,c=Object.keys(t.$__.activePaths.states.modify)[Symbol.iterator]();!(o=(u=c.next()).done);o=!0){var l=u.value;if(n){var f=t.schema.path(l);if(f&&f.$isMongooseDocumentArray)continue}l.startsWith(e+".")&&(delete t.$__.activePaths.states.modify[l],++i)}}catch(t){s=!0,a=t}finally{try{!o&&c.return&&c.return()}finally{if(s)throw a}}return i}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(14).get().Binary,i=r(2),o=r(45).Buffer,s=o.from("").constructor.prototype;function a(t,e,r){var n=void 0;n=0===arguments.length||null===arguments[0]||void 0===arguments[0]?0:t;var s=void 0,u=void 0,l=void 0;Array.isArray(e)?(u=e[0],l=e[1]):s=e;var f=void 0;return f="number"==typeof n||n instanceof Number?o.alloc(n):o.from(n,s,r),i.decorate(f,a.mixin),f.isMongooseBuffer=!0,f[a.pathSymbol]=u,f[c]=l,f._subtype=0,f}var u=Symbol.for("mongoose#Buffer#_path"),c=Symbol.for("mongoose#Buffer#_parent");a.pathSymbol=u,
/*!
 * Inherit from Buffer.
 */
a.mixin={_subtype:void 0,_markModified:function(){var t=this[c];return t&&t.markModified(this[a.pathSymbol]),this},write:function(){var t=s.write.apply(this,arguments);return t>0&&this._markModified(),t},copy:function(t){var e=s.copy.apply(this,arguments);return t&&t.isMongooseBuffer&&t._markModified(),e}},
/*!
 * Compile other Buffer methods marking this buffer as modified.
 */
"writeUInt8 writeUInt16 writeUInt32 writeInt8 writeInt16 writeInt32 writeFloat writeDouble fill utf8Write binaryWrite asciiWrite set writeUInt16LE writeUInt16BE writeUInt32LE writeUInt32BE writeInt16LE writeInt16BE writeInt32LE writeInt32BE writeFloatLE writeFloatBE writeDoubleLE writeDoubleBE".split(" ").forEach(function(t){s[t]&&(a.mixin[t]=function(){var e=s[t].apply(this,arguments);return this._markModified(),e})}),a.mixin.toObject=function(t){var e="number"==typeof t?t:this._subtype||0;return new n(o.from(this),e)},a.mixin.toBSON=function(){return new n(this,this._subtype||0)},a.mixin.equals=function(t){if(!o.isBuffer(t))return!1;if(this.length!==t.length)return!1;for(var e=0;e<this.length;++e)if(this[e]!==t[e])return!1;return!0},a.mixin.subtype=function(t){if("number"!=typeof t)throw new TypeError("Invalid subtype. Expected a number");this._subtype!==t&&this._markModified(),this._subtype=t},
/*!
 * Module exports.
 */
a.Binary=n,t.exports=a},function(t,e,r){"use strict";var n=r(14).get().ObjectId,i=r(21);t.exports=function(t){if(null==t)return t;if(t instanceof n)return t;if(t._id){if(t._id instanceof n)return t._id;if(t._id.toString instanceof Function)return new n(t._id.toString())}if(t.toString instanceof Function)return new n(t.toString());i.ok(!1)}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}(),o=function t(e,r,n){null===e&&(e=Function.prototype);var i=Object.getOwnPropertyDescriptor(e,r);if(void 0===i){var o=Object.getPrototypeOf(e);return null===o?void 0:t(o,r,n)}if("value"in i)return i.value;var s=i.get;return void 0!==s?s.call(n):void 0};var s=r(31),a=r(2).deepEqual,u=r(5),c=r(87),l=r(3),f=r(47),h=r(0).populateModelSymbol,p=function(t){function e(t,r,n,i){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),null!=t&&"Object"===t.constructor.name&&(t=Object.keys(t).reduce(function(e,r){return e.concat([[r,t[r]]])},[]));var o=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,t));return o.$__parent=null!=n&&null!=n.$__?n:null,o.$__path=r,o.$__schemaType=null==i?new s(r):i,o.$__runDeferred(),o}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,Map),i(e,[{key:"$init",value:function(t,r){y(t),o(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"set",this).call(this,t,r),null!=r&&r.$isSingleNested&&(r.$basePath=this.$__path+"."+t)}},{key:"$__set",value:function(t,r){o(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"set",this).call(this,t,r)}},{key:"get",value:function(t,r){return!1===(r=r||{}).getters?o(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"get",this).call(this,t):this.$__schemaType.applyGetters(o(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"get",this).call(this,t),this.$__parent)}},{key:"set",value:function(t,r){if(y(t),r=c(r),null==this.$__schemaType)return this.$__deferred=this.$__deferred||[],void this.$__deferred.push({key:t,value:r});var n=this.$__path+"."+t,i=null!=this.$__parent&&this.$__parent.$__?this.$__parent.populated(n)||this.$__parent.populated(this.$__path):null,s=this.get(t);if(null!=i)null==r.$__&&(r=new i.options[h](r)),r.$__.wasPopulated=!0;else try{r=this.$__schemaType.applySetters(r,this.$__parent,!1,this.get(t))}catch(t){if(null!=this.$__parent&&null!=this.$__parent.$__)return void this.$__parent.invalidate(n,t);throw t}o(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"set",this).call(this,t,r),null!=r&&r.$isSingleNested&&(r.$basePath=this.$__path+"."+t);var u=this.$__parent;null==u||null==u.$__||a(r,s)||u.markModified(this.$__path+"."+t)}},{key:"delete",value:function(t){this.set(t,void 0),o(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"delete",this).call(this,t)}},{key:"toBSON",value:function(){return new Map(this)}},{key:"toObject",value:function(t){if(u(t,"flattenMaps")){var e={},r=this.keys(),n=!0,i=!1,o=void 0;try{for(var s,a=r[Symbol.iterator]();!(n=(s=a.next()).done);n=!0){var c=s.value;e[c]=this.get(c)}}catch(t){i=!0,o=t}finally{try{!n&&a.return&&a.return()}finally{if(i)throw o}}return e}return new Map(this)}},{key:"toJSON",value:function(){var t={},e=this.keys(),r=!0,n=!1,i=void 0;try{for(var o,s=e[Symbol.iterator]();!(r=(o=s.next()).done);r=!0){var a=o.value;t[a]=this.get(a)}}catch(t){n=!0,i=t}finally{try{!r&&s.return&&s.return()}finally{if(n)throw i}}return t}},{key:"inspect",value:function(){return new Map(this)}},{key:"$__runDeferred",value:function(){if(this.$__deferred){var t=!0,e=!1,r=void 0;try{for(var n,i=this.$__deferred[Symbol.iterator]();!(t=(n=i.next()).done);t=!0){var o=n.value;this.set(o.key,o.value)}}catch(t){e=!0,r=t}finally{try{!t&&i.return&&i.return()}finally{if(e)throw r}}this.$__deferred=null}}}]),e}();
/*!
 * Since maps are stored as objects under the hood, keys must be strings
 * and can't contain any invalid characters
 */
function y(t){var e=void 0===t?"undefined":n(t);if("string"!==e)throw new TypeError("Mongoose maps only support string keys, got "+e);if(t.startsWith("$"))throw new Error('Mongoose maps do not support keys that start with "$", got "'+t+'"');if(t.includes("."))throw new Error('Mongoose maps do not support keys that contain ".", got "'+t+'"');if(f.has(t))throw new Error('Mongoose maps do not support reserved key name "'+t+'"')}l.inspect.custom&&Object.defineProperty(p.prototype,l.inspect.custom,{enumerable:!1,writable:!1,configurable:!1,value:p.prototype.inspect}),Object.defineProperty(p.prototype,"$__set",{enumerable:!1,writable:!0,configurable:!1}),Object.defineProperty(p.prototype,"$__parent",{enumerable:!1,writable:!0,configurable:!1}),Object.defineProperty(p.prototype,"$__path",{enumerable:!1,writable:!0,configurable:!1}),Object.defineProperty(p.prototype,"$__schemaType",{enumerable:!1,writable:!0,configurable:!1}),Object.defineProperty(p.prototype,"$isMongooseMap",{enumerable:!1,writable:!1,configurable:!1,value:!0}),Object.defineProperty(p.prototype,"$__deferredCalls",{enumerable:!1,writable:!1,configurable:!1,value:!0}),t.exports=p},function(t,e,r){"use strict";var n=r(2);t.exports=function(t){return n.isPOJO(t)&&null!=t.$__&&null!=t._doc?t._doc:t}},function(t,e,r){"use strict";var n=r(6),i=r(50),o=r(22).internalToObjectOptions,s=r(24),a=r(0).documentArrayParent;function u(t,e,r,i,o){var s=this;this.$isSingleNested=!0;var a=null!=o&&o.priorDoc,u=null;if(a&&(this._doc=Object.assign({},o.priorDoc._doc),delete this._doc[this.schema.options.discriminatorKey],u=Object.keys(o.priorDoc._doc||{}).filter(function(t){return t!==s.schema.options.discriminatorKey})),null!=r&&(o=Object.assign({},o,{isNew:r.isNew})),n.call(this,t,e,i,o),a){var c=!0,l=!1,f=void 0;try{for(var h,p=u[Symbol.iterator]();!(c=(h=p.next()).done);c=!0){var y=h.value;if(!this.$__.activePaths.states.modify[y]&&!this.$__.activePaths.states.default[y]&&!this.$__.$setCalled.has(y)){var d=this.schema.path(y),v=null==d?void 0:d.getDefault(this);void 0===v?delete this._doc[y]:(this._doc[y]=v,this.$__.activePaths.default(y))}}}catch(t){l=!0,f=t}finally{try{!c&&p.return&&p.return()}finally{if(l)throw f}}}}t.exports=u,u.prototype=Object.create(n.prototype),u.prototype.toBSON=function(){return this.toObject(o)},u.prototype.save=function(t,e){var r=this;return"function"==typeof t&&(e=t,t={}),(t=t||{}).suppressWarning||console.warn("mongoose: calling `save()` on a subdoc does **not** save the document to MongoDB, it only runs save middleware. Use `subdoc.save({ suppressWarning: true })` to hide this warning if you're sure this behavior is right for your app."),s(e,function(t){r.$__save(t)})},u.prototype.$__save=function(t){var e=this;return i(function(){return t(null,e)})},u.prototype.$isValid=function(t){return this.$parent&&this.$basePath?this.$parent.$isValid([this.$basePath,t].join(".")):n.prototype.$isValid.call(this,t)},u.prototype.markModified=function(t){if(n.prototype.markModified.call(this,t),this.$parent&&this.$basePath){if(this.$parent.isDirectModified(this.$basePath))return;this.$parent.markModified([this.$basePath,t].join("."),this)}},u.prototype.isModified=function(t,e){var r=this;return this.$parent&&this.$basePath?((Array.isArray(t)||"string"==typeof t)&&(t=(t=Array.isArray(t)?t:t.split(" ")).map(function(t){return[r.$basePath,t].join(".")})),this.$parent.isModified(t,e)):n.prototype.isModified.call(this,t,e)},u.prototype.$markValid=function(t){n.prototype.$markValid.call(this,t),this.$parent&&this.$basePath&&this.$parent.$markValid([this.$basePath,t].join("."))},
/*!
 * ignore
 */
u.prototype.invalidate=function(t,e,r){if(e!==this.ownerDocument().$__.validationError&&n.prototype.invalidate.call(this,t,e,r),this.$parent&&this.$basePath)this.$parent.invalidate([this.$basePath,t].join("."),e,r);else if("cast"===e.kind||"CastError"===e.name)throw e},
/*!
 * ignore
 */
u.prototype.$ignore=function(t){n.prototype.$ignore.call(this,t),this.$parent&&this.$basePath&&this.$parent.$ignore([this.$basePath,t].join("."))},u.prototype.ownerDocument=function(){if(this.$__.ownerDocument)return this.$__.ownerDocument;var t=this.$parent;if(!t)return this;for(;t.$parent||t[a];)t=t.$parent||t[a];return this.$__.ownerDocument=t,this.$__.ownerDocument},u.prototype.parent=function(){return this.$parent},
/*!
 * no-op for hooks
 */
u.prototype.$__remove=function(t){return t(null,this)},u.prototype.remove=function(t,e){"function"==typeof t&&(e=t,t=null),
/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {Subdocument} sub
 * @api private
 */
function(t){var e=t.ownerDocument();function r(){e.removeListener("save",r),e.removeListener("remove",r),t.emit("remove",t),t.constructor.emit("remove",t),e=t=null}e.on("save",r),e.on("remove",r)}(this),t&&t.noop||this.$parent.set(this.$basePath,null),"function"==typeof e&&e(null)},
/*!
 * ignore
 */
u.prototype.populate=function(){throw new Error('Mongoose does not support calling populate() on nested docs. Instead of `doc.nested.populate("path")`, use `doc.populate("nested.path")`')}},function(t,e,r){"use strict";var n=r(58).defineKey,i=r(5),o=r(2),s={toJSON:!0,toObject:!0,_id:!0,id:!0};
/*!
 * ignore
 */
t.exports=function(t,e,r,a,u){if(!r||!r.instanceOfSchema)throw new Error("You must pass a valid discriminator Schema");if(t.schema.discriminatorMapping&&!t.schema.discriminatorMapping.isRoot)throw new Error('Discriminator "'+e+'" can only be a discriminator of the root model');if(u){var c=i(t.base,"options.applyPluginsToDiscriminators",!1);t.base._applyPlugins(r,{skipTopLevel:!c})}var l=t.schema.options.discriminatorKey,f=t.schema.path(l);if(null!=f)o.hasUserDefinedProperty(f.options,"select")||(f.options.select=!0),f.options.$skipDiscriminatorCheck=!0;else{var h={};h[l]={default:void 0,select:!0,$skipDiscriminatorCheck:!0},h[l][t.schema.options.typeKey]=String,t.schema.add(h),n(l,null,t.prototype,null,[l],t.schema.options)}if(r.path(l)&&!0!==r.path(l).options.$skipDiscriminatorCheck)throw new Error('Discriminator "'+e+'" cannot have field with name "'+l+'"');var p=e;if("string"==typeof a&&a.length&&(p=a),function(e,r){e._baseSchema=r,r.paths._id&&r.paths._id.options&&!r.paths._id.options.auto&&e.remove("_id");var n=Object.keys(r.paths),i=[],a=!0,u=!1,c=void 0;try{for(var h,y=n[Symbol.iterator]();!(a=(h=y.next()).done);a=!0){var d=h.value;if(e.nested[d]&&i.push(d),-1!==d.indexOf(".")){var v=d.split("."),_="",m=!0,g=!1,b=void 0;try{for(var w,O=v[Symbol.iterator]();!(m=(w=O.next()).done);m=!0){var S=w.value;_+=(_.length?".":"")+S,(e.paths[_]||e.singleNestedPaths[_])&&i.push(d)}}catch(t){g=!0,b=t}finally{try{!m&&O.return&&O.return()}finally{if(g)throw b}}}}}catch(t){u=!0,c=t}finally{try{!a&&y.return&&y.return()}finally{if(u)throw c}}o.merge(e,r,{omit:{discriminators:!0,base:!0},omitNested:i.reduce(function(t,e){return t["tree."+e]=!0,t},{})});var E=!0,A=!1,j=void 0;try{for(var $,x=i[Symbol.iterator]();!(E=($=x.next()).done);E=!0){var P=$.value;delete e.paths[P]}}catch(t){A=!0,j=t}finally{try{!E&&x.return&&x.return()}finally{if(A)throw j}}e.childSchemas.forEach(function(t){t.model.prototype.$__setSchema(t.schema)});var N={};N[l]={default:p,select:!0,set:function(t){if(t===p)return p;throw new Error("Can't set discriminator key \""+l+'"')},$skipDiscriminatorCheck:!0},N[l][e.options.typeKey]=f?f.instance:String,e.add(N),e.discriminatorMapping={key:l,value:p,isRoot:!1},r.options.collection&&(e.options.collection=r.options.collection);var T=e.options.toJSON,k=e.options.toObject,B=e.options._id,C=e.options.id,D=Object.keys(e.options);e.options.discriminatorKey=r.options.discriminatorKey;var M=!0,R=!1,F=void 0;try{for(var I,L=D[Symbol.iterator]();!(M=(I=L.next()).done);M=!0){var U=I.value;if(!s[U]&&!o.deepEqual(e.options[U],r.options[U]))throw new Error("Can't customize discriminator option "+U+" (can only modify "+Object.keys(s).join(", ")+")")}}catch(t){R=!0,F=t}finally{try{!M&&L.return&&L.return()}finally{if(R)throw F}}e.options=o.clone(r.options),T&&(e.options.toJSON=T),k&&(e.options.toObject=k),void 0!==B&&(e.options._id=B),e.options.id=C,e.s.hooks=t.schema.s.hooks.merge(e.s.hooks),e.plugins=Array.prototype.slice.call(r.plugins),e.callQueue=r.callQueue.concat(e.callQueue),delete e._requiredpaths}(r,t.schema),t.discriminators||(t.discriminators={}),t.schema.discriminatorMapping||(t.schema.discriminatorMapping={key:l,value:null,isRoot:!0}),t.schema.discriminators||(t.schema.discriminators={}),t.schema.discriminators[e]=r,t.discriminators[e])throw new Error('Discriminator with name "'+e+'" already exists');return r}},function(t,e,r){"use strict";var n=r(73);t.exports=function(t,e){return null==e||null==e._id?t:(t=t.clone(),e._id?t.paths._id||(n(t),t.options._id=!0):(t.remove("_id"),t.options._id=!1),t)}},function(t,e,r){"use strict";var n=r(56);
/*!
 * Find the correct constructor, taking into account discriminators
 */t.exports=function(t,e){var r=t.schema.options.discriminatorKey;if(null!=e&&t.discriminators&&null!=e[r])if(t.discriminators[e[r]])t=t.discriminators[e[r]];else{var i=n(t,e[r]);i&&(t=i)}return t}},function(t,e,r){"use strict";
/*!
 * ignore
 */var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};t.exports=function(t){return null==t||("object"!==(void 0===t?"undefined":n(t))||!("$meta"in t||"$slice"in t))}},function(t,e,r){"use strict";t.exports=r(94)},function(t,e,r){"use strict";(function(n){r(14).set(r(98));var i=r(61),o=r(66);i.setBrowser(!0),Object.defineProperty(e,"Promise",{get:function(){return o.get()},set:function(t){o.set(t)}}),e.PromiseProvider=o,e.Error=r(4),e.Schema=r(52),e.Types=r(57),e.VirtualType=r(53),e.SchemaType=r(7),e.utils=r(2),e.Document=i(),e.model=function(t,r){var n=function(t){function n(t,e){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,n),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(n.__proto__||Object.getPrototypeOf(n)).call(this,t,r,e))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(n,e.Document),n}();return n.modelName=t,n},
/*!
 * Module exports.
 */
"undefined"!=typeof window&&(window.mongoose=t.exports,window.Buffer=n)}).call(this,r(1).Buffer)},function(t,e,r){"use strict";e.byteLength=function(t){var e=c(t),r=e[0],n=e[1];return 3*(r+n)/4-n},e.toByteArray=function(t){var e,r,n=c(t),s=n[0],a=n[1],u=new o(function(t,e,r){return 3*(e+r)/4-r}(0,s,a)),l=0,f=a>0?s-4:s;for(r=0;r<f;r+=4)e=i[t.charCodeAt(r)]<<18|i[t.charCodeAt(r+1)]<<12|i[t.charCodeAt(r+2)]<<6|i[t.charCodeAt(r+3)],u[l++]=e>>16&255,u[l++]=e>>8&255,u[l++]=255&e;2===a&&(e=i[t.charCodeAt(r)]<<2|i[t.charCodeAt(r+1)]>>4,u[l++]=255&e);1===a&&(e=i[t.charCodeAt(r)]<<10|i[t.charCodeAt(r+1)]<<4|i[t.charCodeAt(r+2)]>>2,u[l++]=e>>8&255,u[l++]=255&e);return u},e.fromByteArray=function(t){for(var e,r=t.length,i=r%3,o=[],s=0,a=r-i;s<a;s+=16383)o.push(f(t,s,s+16383>a?a:s+16383));1===i?(e=t[r-1],o.push(n[e>>2]+n[e<<4&63]+"==")):2===i&&(e=(t[r-2]<<8)+t[r-1],o.push(n[e>>10]+n[e>>4&63]+n[e<<2&63]+"="));return o.join("")};for(var n=[],i=[],o="undefined"!=typeof Uint8Array?Uint8Array:Array,s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a=0,u=s.length;a<u;++a)n[a]=s[a],i[s.charCodeAt(a)]=a;function c(t){var e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var r=t.indexOf("=");return-1===r&&(r=e),[r,r===e?0:4-r%4]}function l(t){return n[t>>18&63]+n[t>>12&63]+n[t>>6&63]+n[63&t]}function f(t,e,r){for(var n,i=[],o=e;o<r;o+=3)n=(t[o]<<16&16711680)+(t[o+1]<<8&65280)+(255&t[o+2]),i.push(l(n));return i.join("")}i["-".charCodeAt(0)]=62,i["_".charCodeAt(0)]=63},function(t,e,r){"use strict";e.read=function(t,e,r,n,i){var o,s,a=8*i-n-1,u=(1<<a)-1,c=u>>1,l=-7,f=r?i-1:0,h=r?-1:1,p=t[e+f];for(f+=h,o=p&(1<<-l)-1,p>>=-l,l+=a;l>0;o=256*o+t[e+f],f+=h,l-=8);for(s=o&(1<<-l)-1,o>>=-l,l+=n;l>0;s=256*s+t[e+f],f+=h,l-=8);if(0===o)o=1-c;else{if(o===u)return s?NaN:1/0*(p?-1:1);s+=Math.pow(2,n),o-=c}return(p?-1:1)*s*Math.pow(2,o-n)},e.write=function(t,e,r,n,i,o){var s,a,u,c=8*o-i-1,l=(1<<c)-1,f=l>>1,h=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,p=n?0:o-1,y=n?1:-1,d=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,s=l):(s=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-s))<1&&(s--,u*=2),(e+=s+f>=1?h/u:h*Math.pow(2,1-f))*u>=2&&(s++,u/=2),s+f>=l?(a=0,s=l):s+f>=1?(a=(e*u-1)*Math.pow(2,i),s+=f):(a=e*Math.pow(2,f-1)*Math.pow(2,i),s=0));i>=8;t[r+p]=255&a,p+=y,a/=256,i-=8);for(s=s<<i|a,c+=i;c>0;t[r+p]=255&s,p+=y,s/=256,c-=8);t[r+p-y]|=128*d}},function(t,e,r){"use strict";var n={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==n.call(t)}},function(t,e,r){"use strict";
/*!
 * Module exports.
 */e.Binary=r(99),e.Collection=function(){throw new Error("Cannot create a collection from browser library")},e.Decimal128=r(106),e.ObjectId=r(107),e.ReadPreference=r(108)},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(33).Binary;
/*!
 * Module exports.
 */t.exports=n},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};t.exports=function(t){return t&&"object"===(void 0===t?"undefined":n(t))&&"function"==typeof t.copy&&"function"==typeof t.fill&&"function"==typeof t.readUInt8}},function(t,e,r){"use strict";"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(t,e){t.super_=e;var r=function(){};r.prototype=e.prototype,t.prototype=new r,t.prototype.constructor=t}},function(module,exports,__webpack_require__){"use strict";var Long=__webpack_require__(23).Long,Double=__webpack_require__(34).Double,Timestamp=__webpack_require__(35).Timestamp,ObjectID=__webpack_require__(36).ObjectID,_Symbol=__webpack_require__(38).Symbol,Code=__webpack_require__(39).Code,MinKey=__webpack_require__(41).MinKey,MaxKey=__webpack_require__(42).MaxKey,Decimal128=__webpack_require__(40),Int32=__webpack_require__(60),DBRef=__webpack_require__(43).DBRef,BSONRegExp=__webpack_require__(37).BSONRegExp,Binary=__webpack_require__(26).Binary,utils=__webpack_require__(15),deserialize=function(t,e,r){var n=(e=null==e?{}:e)&&e.index?e.index:0,i=t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24;if(i<5||t.length<i||i+n>t.length)throw new Error("corrupt bson message");if(0!==t[n+i-1])throw new Error("One object, sized correctly, with a spot for an EOO, but the EOO isn't 0x00");return deserializeObject(t,n,e,r)},deserializeObject=function t(e,r,n,i){var o=null!=n.evalFunctions&&n.evalFunctions,s=null!=n.cacheFunctions&&n.cacheFunctions,a=null!=n.cacheFunctionsCrc32&&n.cacheFunctionsCrc32;if(!a)var u=null;var c=null==n.fieldsAsRaw?null:n.fieldsAsRaw,l=null!=n.raw&&n.raw,f="boolean"==typeof n.bsonRegExp&&n.bsonRegExp,h=null!=n.promoteBuffers&&n.promoteBuffers,p=null==n.promoteLongs||n.promoteLongs,y=null==n.promoteValues||n.promoteValues,d=r;if(e.length<5)throw new Error("corrupt bson message < 5 bytes long");var v=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24;if(v<5||v>e.length)throw new Error("corrupt bson message");for(var _=i?[]:{},m=0;;){var g=e[r++];if(0===g)break;for(var b=r;0!==e[b]&&b<e.length;)b++;if(b>=e.length)throw new Error("Bad BSON Document: illegal CString");var w=i?m++:e.toString("utf8",r,b);if(r=b+1,g===BSON.BSON_DATA_STRING){var O=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24;if(O<=0||O>e.length-r||0!==e[r+O-1])throw new Error("bad string length in bson");_[w]=e.toString("utf8",r,r+O-1),r+=O}else if(g===BSON.BSON_DATA_OID){var S=utils.allocBuffer(12);e.copy(S,0,r,r+12),_[w]=new ObjectID(S),r+=12}else if(g===BSON.BSON_DATA_INT&&!1===y)_[w]=new Int32(e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24);else if(g===BSON.BSON_DATA_INT)_[w]=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24;else if(g===BSON.BSON_DATA_NUMBER&&!1===y)_[w]=new Double(e.readDoubleLE(r)),r+=8;else if(g===BSON.BSON_DATA_NUMBER)_[w]=e.readDoubleLE(r),r+=8;else if(g===BSON.BSON_DATA_DATE){var E=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24,A=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24;_[w]=new Date(new Long(E,A).toNumber())}else if(g===BSON.BSON_DATA_BOOLEAN){if(0!==e[r]&&1!==e[r])throw new Error("illegal boolean type value");_[w]=1===e[r++]}else if(g===BSON.BSON_DATA_OBJECT){var j=r,$=e[r]|e[r+1]<<8|e[r+2]<<16|e[r+3]<<24;if($<=0||$>e.length-r)throw new Error("bad embedded document length in bson");_[w]=l?e.slice(r,r+$):t(e,j,n,!1),r+=$}else if(g===BSON.BSON_DATA_ARRAY){j=r;var x=n,P=r+($=e[r]|e[r+1]<<8|e[r+2]<<16|e[r+3]<<24);if(c&&c[w]){for(var N in x={},n)x[N]=n[N];x.raw=!0}if(_[w]=t(e,j,x,!0),0!==e[(r+=$)-1])throw new Error("invalid array terminator byte");if(r!==P)throw new Error("corrupted array bson")}else if(g===BSON.BSON_DATA_UNDEFINED)_[w]=void 0;else if(g===BSON.BSON_DATA_NULL)_[w]=null;else if(g===BSON.BSON_DATA_LONG){E=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24,A=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24;var T=new Long(E,A);_[w]=p&&!0===y&&T.lessThanOrEqual(JS_INT_MAX_LONG)&&T.greaterThanOrEqual(JS_INT_MIN_LONG)?T.toNumber():T}else if(g===BSON.BSON_DATA_DECIMAL128){var k=utils.allocBuffer(16);e.copy(k,0,r,r+16),r+=16;var B=new Decimal128(k);_[w]=B.toObject?B.toObject():B}else if(g===BSON.BSON_DATA_BINARY){var C=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24,D=C,M=e[r++];if(C<0)throw new Error("Negative binary type element size found");if(C>e.length)throw new Error("Binary type size larger than document size");if(null!=e.slice){if(M===Binary.SUBTYPE_BYTE_ARRAY){if((C=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24)<0)throw new Error("Negative binary type element size found for subtype 0x02");if(C>D-4)throw new Error("Binary type with subtype 0x02 contains to long binary size");if(C<D-4)throw new Error("Binary type with subtype 0x02 contains to short binary size")}_[w]=h&&y?e.slice(r,r+C):new Binary(e.slice(r,r+C),M)}else{var R="undefined"!=typeof Uint8Array?new Uint8Array(new ArrayBuffer(C)):new Array(C);if(M===Binary.SUBTYPE_BYTE_ARRAY){if((C=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24)<0)throw new Error("Negative binary type element size found for subtype 0x02");if(C>D-4)throw new Error("Binary type with subtype 0x02 contains to long binary size");if(C<D-4)throw new Error("Binary type with subtype 0x02 contains to short binary size")}for(b=0;b<C;b++)R[b]=e[r+b];_[w]=h&&y?R:new Binary(R,M)}r+=C}else if(g===BSON.BSON_DATA_REGEXP&&!1===f){for(b=r;0!==e[b]&&b<e.length;)b++;if(b>=e.length)throw new Error("Bad BSON Document: illegal CString");var F=e.toString("utf8",r,b);for(b=r=b+1;0!==e[b]&&b<e.length;)b++;if(b>=e.length)throw new Error("Bad BSON Document: illegal CString");var I=e.toString("utf8",r,b);r=b+1;var L=new Array(I.length);for(b=0;b<I.length;b++)switch(I[b]){case"m":L[b]="m";break;case"s":L[b]="g";break;case"i":L[b]="i"}_[w]=new RegExp(F,L.join(""))}else if(g===BSON.BSON_DATA_REGEXP&&!0===f){for(b=r;0!==e[b]&&b<e.length;)b++;if(b>=e.length)throw new Error("Bad BSON Document: illegal CString");for(F=e.toString("utf8",r,b),b=r=b+1;0!==e[b]&&b<e.length;)b++;if(b>=e.length)throw new Error("Bad BSON Document: illegal CString");I=e.toString("utf8",r,b),r=b+1,_[w]=new BSONRegExp(F,I)}else if(g===BSON.BSON_DATA_SYMBOL){if((O=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24)<=0||O>e.length-r||0!==e[r+O-1])throw new Error("bad string length in bson");_[w]=new _Symbol(e.toString("utf8",r,r+O-1)),r+=O}else if(g===BSON.BSON_DATA_TIMESTAMP)E=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24,A=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24,_[w]=new Timestamp(E,A);else if(g===BSON.BSON_DATA_MIN_KEY)_[w]=new MinKey;else if(g===BSON.BSON_DATA_MAX_KEY)_[w]=new MaxKey;else if(g===BSON.BSON_DATA_CODE){if((O=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24)<=0||O>e.length-r||0!==e[r+O-1])throw new Error("bad string length in bson");var U=e.toString("utf8",r,r+O-1);if(o)if(s){var V=a?u(U):U;_[w]=isolateEvalWithHash(functionCache,V,U,_)}else _[w]=isolateEval(U);else _[w]=new Code(U);r+=O}else if(g===BSON.BSON_DATA_CODE_W_SCOPE){var q=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24;if(q<13)throw new Error("code_w_scope total size shorter minimum expected length");if((O=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24)<=0||O>e.length-r||0!==e[r+O-1])throw new Error("bad string length in bson");U=e.toString("utf8",r,r+O-1),j=r+=O,$=e[r]|e[r+1]<<8|e[r+2]<<16|e[r+3]<<24;var W=t(e,j,n,!1);if(r+=$,q<8+$+O)throw new Error("code_w_scope total size is to short, truncating scope");if(q>8+$+O)throw new Error("code_w_scope total size is to long, clips outer document");o?(s?(V=a?u(U):U,_[w]=isolateEvalWithHash(functionCache,V,U,_)):_[w]=isolateEval(U),_[w].scope=W):_[w]=new Code(U,W)}else{if(g!==BSON.BSON_DATA_DBPOINTER)throw new Error("Detected unknown BSON type "+g.toString(16)+' for fieldname "'+w+'", are you using the latest BSON parser');if((O=e[r++]|e[r++]<<8|e[r++]<<16|e[r++]<<24)<=0||O>e.length-r||0!==e[r+O-1])throw new Error("bad string length in bson");var H=e.toString("utf8",r,r+O-1);r+=O;var Y=utils.allocBuffer(12);e.copy(Y,0,r,r+12),S=new ObjectID(Y),r+=12;var z=H.split("."),K=z.shift(),Q=z.join(".");_[w]=new DBRef(Q,S,K)}}if(v!==r-d){if(i)throw new Error("corrupt array bson");throw new Error("corrupt object bson")}return null!=_.$id&&(_=new DBRef(_.$ref,_.$id,_.$db)),_},isolateEvalWithHash=function isolateEvalWithHash(functionCache,hash,functionString,object){var value=null;return null==functionCache[hash]&&(eval("value = "+functionString),functionCache[hash]=value),functionCache[hash].bind(object)},isolateEval=function isolateEval(functionString){var value=null;return eval("value = "+functionString),value},BSON={},functionCache=BSON.functionCache={};BSON.BSON_DATA_NUMBER=1,BSON.BSON_DATA_STRING=2,BSON.BSON_DATA_OBJECT=3,BSON.BSON_DATA_ARRAY=4,BSON.BSON_DATA_BINARY=5,BSON.BSON_DATA_UNDEFINED=6,BSON.BSON_DATA_OID=7,BSON.BSON_DATA_BOOLEAN=8,BSON.BSON_DATA_DATE=9,BSON.BSON_DATA_NULL=10,BSON.BSON_DATA_REGEXP=11,BSON.BSON_DATA_DBPOINTER=12,BSON.BSON_DATA_CODE=13,BSON.BSON_DATA_SYMBOL=14,BSON.BSON_DATA_CODE_W_SCOPE=15,BSON.BSON_DATA_INT=16,BSON.BSON_DATA_TIMESTAMP=17,BSON.BSON_DATA_LONG=18,BSON.BSON_DATA_DECIMAL128=19,BSON.BSON_DATA_MIN_KEY=255,BSON.BSON_DATA_MAX_KEY=127,BSON.BSON_BINARY_SUBTYPE_DEFAULT=0,BSON.BSON_BINARY_SUBTYPE_FUNCTION=1,BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY=2,BSON.BSON_BINARY_SUBTYPE_UUID=3,BSON.BSON_BINARY_SUBTYPE_MD5=4,BSON.BSON_BINARY_SUBTYPE_USER_DEFINED=128,BSON.BSON_INT32_MAX=2147483647,BSON.BSON_INT32_MIN=-2147483648,BSON.BSON_INT64_MAX=Math.pow(2,63)-1,BSON.BSON_INT64_MIN=-Math.pow(2,63),BSON.JS_INT_MAX=9007199254740992,BSON.JS_INT_MIN=-9007199254740992;var JS_INT_MAX_LONG=Long.fromNumber(9007199254740992),JS_INT_MIN_LONG=Long.fromNumber(-9007199254740992);module.exports=deserialize},function(t,e,r){"use strict";(function(e){var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(104).writeIEEE754,o=r(23).Long,s=r(59),a=r(26).Binary,u=r(15).normalizedFunctionString,c=/\x00/,l=["$db","$ref","$id","$clusterTime"],f=function(t){return"object"===(void 0===t?"undefined":n(t))&&"[object Date]"===Object.prototype.toString.call(t)},h=function(t){return"[object RegExp]"===Object.prototype.toString.call(t)},p=function(t,e,r,n,i){t[n++]=C.BSON_DATA_STRING,t[(n=n+(i?t.write(e,n,"ascii"):t.write(e,n,"utf8"))+1)-1]=0;var o=t.write(r,n+4,"utf8");return t[n+3]=o+1>>24&255,t[n+2]=o+1>>16&255,t[n+1]=o+1>>8&255,t[n]=o+1&255,n=n+4+o,t[n++]=0,n},y=function(t,e,r,n,s){if(Math.floor(r)===r&&r>=C.JS_INT_MIN&&r<=C.JS_INT_MAX)if(r>=C.BSON_INT32_MIN&&r<=C.BSON_INT32_MAX){t[n++]=C.BSON_DATA_INT;var a=s?t.write(e,n,"ascii"):t.write(e,n,"utf8");n+=a,t[n++]=0,t[n++]=255&r,t[n++]=r>>8&255,t[n++]=r>>16&255,t[n++]=r>>24&255}else if(r>=C.JS_INT_MIN&&r<=C.JS_INT_MAX)t[n++]=C.BSON_DATA_NUMBER,n+=a=s?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,i(t,r,n,"little",52,8),n+=8;else{t[n++]=C.BSON_DATA_LONG,n+=a=s?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var u=o.fromNumber(r),c=u.getLowBits(),l=u.getHighBits();t[n++]=255&c,t[n++]=c>>8&255,t[n++]=c>>16&255,t[n++]=c>>24&255,t[n++]=255&l,t[n++]=l>>8&255,t[n++]=l>>16&255,t[n++]=l>>24&255}else t[n++]=C.BSON_DATA_NUMBER,n+=a=s?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,i(t,r,n,"little",52,8),n+=8;return n},d=function(t,e,r,n,i){return t[n++]=C.BSON_DATA_NULL,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,n},v=function(t,e,r,n,i){return t[n++]=C.BSON_DATA_BOOLEAN,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,t[n++]=r?1:0,n},_=function(t,e,r,n,i){t[n++]=C.BSON_DATA_DATE,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var s=o.fromNumber(r.getTime()),a=s.getLowBits(),u=s.getHighBits();return t[n++]=255&a,t[n++]=a>>8&255,t[n++]=a>>16&255,t[n++]=a>>24&255,t[n++]=255&u,t[n++]=u>>8&255,t[n++]=u>>16&255,t[n++]=u>>24&255,n},m=function(t,e,r,n,i){if(t[n++]=C.BSON_DATA_REGEXP,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,r.source&&null!=r.source.match(c))throw Error("value "+r.source+" must not contain null bytes");return n+=t.write(r.source,n,"utf8"),t[n++]=0,r.global&&(t[n++]=115),r.ignoreCase&&(t[n++]=105),r.multiline&&(t[n++]=109),t[n++]=0,n},g=function(t,e,r,n,i){if(t[n++]=C.BSON_DATA_REGEXP,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,null!=r.pattern.match(c))throw Error("pattern "+r.pattern+" must not contain null bytes");return n+=t.write(r.pattern,n,"utf8"),t[n++]=0,n+=t.write(r.options.split("").sort().join(""),n,"utf8"),t[n++]=0,n},b=function(t,e,r,n,i){return null===r?t[n++]=C.BSON_DATA_NULL:"MinKey"===r._bsontype?t[n++]=C.BSON_DATA_MIN_KEY:t[n++]=C.BSON_DATA_MAX_KEY,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,n},w=function(t,e,r,n,i){if(t[n++]=C.BSON_DATA_OID,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,"string"==typeof r.id)t.write(r.id,n,"binary");else{if(!r.id||!r.id.copy)throw new Error("object ["+JSON.stringify(r)+"] is not a valid ObjectId");r.id.copy(t,n,0,12)}return n+12},O=function(t,e,r,n,i){t[n++]=C.BSON_DATA_BINARY,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var o=r.length;return t[n++]=255&o,t[n++]=o>>8&255,t[n++]=o>>16&255,t[n++]=o>>24&255,t[n++]=C.BSON_BINARY_SUBTYPE_DEFAULT,r.copy(t,n,0,o),n+=o},S=function(t,e,r,n,i,o,s,a,u,c){for(var l=0;l<c.length;l++)if(c[l]===r)throw new Error("cyclic dependency detected");c.push(r),t[n++]=Array.isArray(r)?C.BSON_DATA_ARRAY:C.BSON_DATA_OBJECT,n+=u?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var f=B(t,r,i,n,o+1,s,a,c);return c.pop(),f},E=function(t,e,r,n,i){return t[n++]=C.BSON_DATA_DECIMAL128,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,r.bytes.copy(t,n,0,16),n+16},A=function(t,e,r,n,i){t[n++]="Long"===r._bsontype?C.BSON_DATA_LONG:C.BSON_DATA_TIMESTAMP,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var o=r.getLowBits(),s=r.getHighBits();return t[n++]=255&o,t[n++]=o>>8&255,t[n++]=o>>16&255,t[n++]=o>>24&255,t[n++]=255&s,t[n++]=s>>8&255,t[n++]=s>>16&255,t[n++]=s>>24&255,n},j=function(t,e,r,n,i){return t[n++]=C.BSON_DATA_INT,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,t[n++]=255&r,t[n++]=r>>8&255,t[n++]=r>>16&255,t[n++]=r>>24&255,n},$=function(t,e,r,n,o){return t[n++]=C.BSON_DATA_NUMBER,n+=o?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0,i(t,r,n,"little",52,8),n+=8},x=function(t,e,r,n,i,o,s){t[n++]=C.BSON_DATA_CODE,n+=s?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var a=u(r),c=t.write(a,n+4,"utf8")+1;return t[n]=255&c,t[n+1]=c>>8&255,t[n+2]=c>>16&255,t[n+3]=c>>24&255,n=n+4+c-1,t[n++]=0,n},P=function(t,e,r,i,o,s,a,u,c){if(r.scope&&"object"===n(r.scope)){t[i++]=C.BSON_DATA_CODE_W_SCOPE;var l=c?t.write(e,i,"ascii"):t.write(e,i,"utf8");i+=l,t[i++]=0;var f=i,h="string"==typeof r.code?r.code:r.code.toString();i+=4;var p=t.write(h,i+4,"utf8")+1;t[i]=255&p,t[i+1]=p>>8&255,t[i+2]=p>>16&255,t[i+3]=p>>24&255,t[i+4+p-1]=0,i=i+p+4;var y=B(t,r.scope,o,i,s+1,a,u);i=y-1;var d=y-f;t[f++]=255&d,t[f++]=d>>8&255,t[f++]=d>>16&255,t[f++]=d>>24&255,t[i++]=0}else{t[i++]=C.BSON_DATA_CODE,i+=l=c?t.write(e,i,"ascii"):t.write(e,i,"utf8"),t[i++]=0,h=r.code.toString();var v=t.write(h,i+4,"utf8")+1;t[i]=255&v,t[i+1]=v>>8&255,t[i+2]=v>>16&255,t[i+3]=v>>24&255,i=i+4+v-1,t[i++]=0}return i},N=function(t,e,r,n,i){t[n++]=C.BSON_DATA_BINARY,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var o=r.value(!0),s=r.position;return r.sub_type===a.SUBTYPE_BYTE_ARRAY&&(s+=4),t[n++]=255&s,t[n++]=s>>8&255,t[n++]=s>>16&255,t[n++]=s>>24&255,t[n++]=r.sub_type,r.sub_type===a.SUBTYPE_BYTE_ARRAY&&(s-=4,t[n++]=255&s,t[n++]=s>>8&255,t[n++]=s>>16&255,t[n++]=s>>24&255),o.copy(t,n,0,r.position),n+=r.position},T=function(t,e,r,n,i){t[n++]=C.BSON_DATA_SYMBOL,n+=i?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var o=t.write(r.value,n+4,"utf8")+1;return t[n]=255&o,t[n+1]=o>>8&255,t[n+2]=o>>16&255,t[n+3]=o>>24&255,n=n+4+o-1,t[n++]=0,n},k=function(t,e,r,n,i,o,s){t[n++]=C.BSON_DATA_OBJECT,n+=s?t.write(e,n,"ascii"):t.write(e,n,"utf8"),t[n++]=0;var a,u=n,c=(a=null!=r.db?B(t,{$ref:r.namespace,$id:r.oid,$db:r.db},!1,n,i+1,o):B(t,{$ref:r.namespace,$id:r.oid},!1,n,i+1,o))-u;return t[u++]=255&c,t[u++]=c>>8&255,t[u++]=c>>16&255,t[u++]=c>>24&255,a},B=function(t,r,i,o,a,u,B,C){o=o||0,(C=C||[]).push(r);var D=o+4;if(Array.isArray(r))for(var M=0;M<r.length;M++){var R=""+M,F=r[M];if(F&&F.toBSON){if("function"!=typeof F.toBSON)throw new Error("toBSON is not a function");F=F.toBSON()}var I=void 0===F?"undefined":n(F);if("string"===I)D=p(t,R,F,D,!0);else if("number"===I)D=y(t,R,F,D,!0);else if("boolean"===I)D=v(t,R,F,D,!0);else if(F instanceof Date||f(F))D=_(t,R,F,D,!0);else if(void 0===F)D=d(t,R,0,D,!0);else if(null===F)D=d(t,R,0,D,!0);else if("ObjectID"===F._bsontype||"ObjectId"===F._bsontype)D=w(t,R,F,D,!0);else if(e.isBuffer(F))D=O(t,R,F,D,!0);else if(F instanceof RegExp||h(F))D=m(t,R,F,D,!0);else if("object"===I&&null==F._bsontype)D=S(t,R,F,D,i,a,u,B,!0,C);else if("object"===I&&"Decimal128"===F._bsontype)D=E(t,R,F,D,!0);else if("Long"===F._bsontype||"Timestamp"===F._bsontype)D=A(t,R,F,D,!0);else if("Double"===F._bsontype)D=$(t,R,F,D,!0);else if("function"==typeof F&&u)D=x(t,R,F,D,0,0,u);else if("Code"===F._bsontype)D=P(t,R,F,D,i,a,u,B,!0);else if("Binary"===F._bsontype)D=N(t,R,F,D,!0);else if("Symbol"===F._bsontype)D=T(t,R,F,D,!0);else if("DBRef"===F._bsontype)D=k(t,R,F,D,a,u,!0);else if("BSONRegExp"===F._bsontype)D=g(t,R,F,D,!0);else if("Int32"===F._bsontype)D=j(t,R,F,D,!0);else if("MinKey"===F._bsontype||"MaxKey"===F._bsontype)D=b(t,R,F,D,!0);else if(void 0!==F._bsontype)throw new TypeError("Unrecognized or invalid _bsontype: "+F._bsontype)}else if(r instanceof s)for(var L=r.entries(),U=!1;!U;){var V=L.next();if(!(U=V.done)){if(R=V.value[0],I=void 0===(F=V.value[1])?"undefined":n(F),"string"==typeof R&&-1===l.indexOf(R)){if(null!=R.match(c))throw Error("key "+R+" must not contain null bytes");if(i){if("$"===R[0])throw Error("key "+R+" must not start with '$'");if(~R.indexOf("."))throw Error("key "+R+" must not contain '.'")}}if("string"===I)D=p(t,R,F,D);else if("number"===I)D=y(t,R,F,D);else if("boolean"===I)D=v(t,R,F,D);else if(F instanceof Date||f(F))D=_(t,R,F,D);else if(null===F||void 0===F&&!1===B)D=d(t,R,0,D);else if("ObjectID"===F._bsontype||"ObjectId"===F._bsontype)D=w(t,R,F,D);else if(e.isBuffer(F))D=O(t,R,F,D);else if(F instanceof RegExp||h(F))D=m(t,R,F,D);else if("object"===I&&null==F._bsontype)D=S(t,R,F,D,i,a,u,B,!1,C);else if("object"===I&&"Decimal128"===F._bsontype)D=E(t,R,F,D);else if("Long"===F._bsontype||"Timestamp"===F._bsontype)D=A(t,R,F,D);else if("Double"===F._bsontype)D=$(t,R,F,D);else if("Code"===F._bsontype)D=P(t,R,F,D,i,a,u,B);else if("function"==typeof F&&u)D=x(t,R,F,D,0,0,u);else if("Binary"===F._bsontype)D=N(t,R,F,D);else if("Symbol"===F._bsontype)D=T(t,R,F,D);else if("DBRef"===F._bsontype)D=k(t,R,F,D,a,u);else if("BSONRegExp"===F._bsontype)D=g(t,R,F,D);else if("Int32"===F._bsontype)D=j(t,R,F,D);else if("MinKey"===F._bsontype||"MaxKey"===F._bsontype)D=b(t,R,F,D);else if(void 0!==F._bsontype)throw new TypeError("Unrecognized or invalid _bsontype: "+F._bsontype)}}else{if(r.toBSON){if("function"!=typeof r.toBSON)throw new Error("toBSON is not a function");if(null!=(r=r.toBSON())&&"object"!==(void 0===r?"undefined":n(r)))throw new Error("toBSON function did not return an object")}for(R in r){if((F=r[R])&&F.toBSON){if("function"!=typeof F.toBSON)throw new Error("toBSON is not a function");F=F.toBSON()}if(I=void 0===F?"undefined":n(F),"string"==typeof R&&-1===l.indexOf(R)){if(null!=R.match(c))throw Error("key "+R+" must not contain null bytes");if(i){if("$"===R[0])throw Error("key "+R+" must not start with '$'");if(~R.indexOf("."))throw Error("key "+R+" must not contain '.'")}}if("string"===I)D=p(t,R,F,D);else if("number"===I)D=y(t,R,F,D);else if("boolean"===I)D=v(t,R,F,D);else if(F instanceof Date||f(F))D=_(t,R,F,D);else if(void 0===F)!1===B&&(D=d(t,R,0,D));else if(null===F)D=d(t,R,0,D);else if("ObjectID"===F._bsontype||"ObjectId"===F._bsontype)D=w(t,R,F,D);else if(e.isBuffer(F))D=O(t,R,F,D);else if(F instanceof RegExp||h(F))D=m(t,R,F,D);else if("object"===I&&null==F._bsontype)D=S(t,R,F,D,i,a,u,B,!1,C);else if("object"===I&&"Decimal128"===F._bsontype)D=E(t,R,F,D);else if("Long"===F._bsontype||"Timestamp"===F._bsontype)D=A(t,R,F,D);else if("Double"===F._bsontype)D=$(t,R,F,D);else if("Code"===F._bsontype)D=P(t,R,F,D,i,a,u,B);else if("function"==typeof F&&u)D=x(t,R,F,D,0,0,u);else if("Binary"===F._bsontype)D=N(t,R,F,D);else if("Symbol"===F._bsontype)D=T(t,R,F,D);else if("DBRef"===F._bsontype)D=k(t,R,F,D,a,u);else if("BSONRegExp"===F._bsontype)D=g(t,R,F,D);else if("Int32"===F._bsontype)D=j(t,R,F,D);else if("MinKey"===F._bsontype||"MaxKey"===F._bsontype)D=b(t,R,F,D);else if(void 0!==F._bsontype)throw new TypeError("Unrecognized or invalid _bsontype: "+F._bsontype)}}C.pop(),t[D++]=0;var q=D-o;return t[o++]=255&q,t[o++]=q>>8&255,t[o++]=q>>16&255,t[o++]=q>>24&255,D},C={BSON_DATA_NUMBER:1,BSON_DATA_STRING:2,BSON_DATA_OBJECT:3,BSON_DATA_ARRAY:4,BSON_DATA_BINARY:5,BSON_DATA_UNDEFINED:6,BSON_DATA_OID:7,BSON_DATA_BOOLEAN:8,BSON_DATA_DATE:9,BSON_DATA_NULL:10,BSON_DATA_REGEXP:11,BSON_DATA_CODE:13,BSON_DATA_SYMBOL:14,BSON_DATA_CODE_W_SCOPE:15,BSON_DATA_INT:16,BSON_DATA_TIMESTAMP:17,BSON_DATA_LONG:18,BSON_DATA_DECIMAL128:19,BSON_DATA_MIN_KEY:255,BSON_DATA_MAX_KEY:127,BSON_BINARY_SUBTYPE_DEFAULT:0,BSON_BINARY_SUBTYPE_FUNCTION:1,BSON_BINARY_SUBTYPE_BYTE_ARRAY:2,BSON_BINARY_SUBTYPE_UUID:3,BSON_BINARY_SUBTYPE_MD5:4,BSON_BINARY_SUBTYPE_USER_DEFINED:128,BSON_INT32_MAX:2147483647,BSON_INT32_MIN:-2147483648};C.BSON_INT64_MAX=Math.pow(2,63)-1,C.BSON_INT64_MIN=-Math.pow(2,63),C.JS_INT_MAX=9007199254740992,C.JS_INT_MIN=-9007199254740992,t.exports=B}).call(this,r(1).Buffer)},function(t,e,r){"use strict";e.readIEEE754=function(t,e,r,n,i){var o,s,a="big"===r,u=8*i-n-1,c=(1<<u)-1,l=c>>1,f=-7,h=a?0:i-1,p=a?1:-1,y=t[e+h];for(h+=p,o=y&(1<<-f)-1,y>>=-f,f+=u;f>0;o=256*o+t[e+h],h+=p,f-=8);for(s=o&(1<<-f)-1,o>>=-f,f+=n;f>0;s=256*s+t[e+h],h+=p,f-=8);if(0===o)o=1-l;else{if(o===c)return s?NaN:1/0*(y?-1:1);s+=Math.pow(2,n),o-=l}return(y?-1:1)*s*Math.pow(2,o-n)},e.writeIEEE754=function(t,e,r,n,i,o){var s,a,u,c="big"===n,l=8*o-i-1,f=(1<<l)-1,h=f>>1,p=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,y=c?o-1:0,d=c?-1:1,v=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,s=f):(s=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-s))<1&&(s--,u*=2),(e+=s+h>=1?p/u:p*Math.pow(2,1-h))*u>=2&&(s++,u/=2),s+h>=f?(a=0,s=f):s+h>=1?(a=(e*u-1)*Math.pow(2,i),s+=h):(a=e*Math.pow(2,h-1)*Math.pow(2,i),s=0));i>=8;t[r+y]=255&a,y+=d,a/=256,i-=8);for(s=s<<i|a,l+=i;l>0;t[r+y]=255&s,y+=d,s/=256,l-=8);t[r+y-d]|=128*v}},function(t,e,r){"use strict";(function(e){var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(23).Long,o=r(34).Double,s=r(35).Timestamp,a=r(36).ObjectID,u=r(38).Symbol,c=r(37).BSONRegExp,l=r(39).Code,f=r(40),h=r(41).MinKey,p=r(42).MaxKey,y=r(43).DBRef,d=r(26).Binary,v=r(15).normalizedFunctionString,_=function(t){return"object"===(void 0===t?"undefined":n(t))&&"[object Date]"===Object.prototype.toString.call(t)},m=function(t,e,r){var n=5;if(Array.isArray(t))for(var i=0;i<t.length;i++)n+=g(i.toString(),t[i],e,!0,r);else for(var o in t.toBSON&&(t=t.toBSON()),t)n+=g(o,t[o],e,!1,r);return n};function g(t,r,g,w,O){switch(r&&r.toBSON&&(r=r.toBSON()),void 0===r?"undefined":n(r)){case"string":return 1+e.byteLength(t,"utf8")+1+4+e.byteLength(r,"utf8")+1;case"number":return Math.floor(r)===r&&r>=b.JS_INT_MIN&&r<=b.JS_INT_MAX&&r>=b.BSON_INT32_MIN&&r<=b.BSON_INT32_MAX?(null!=t?e.byteLength(t,"utf8")+1:0)+5:(null!=t?e.byteLength(t,"utf8")+1:0)+9;case"undefined":return w||!O?(null!=t?e.byteLength(t,"utf8")+1:0)+1:0;case"boolean":return(null!=t?e.byteLength(t,"utf8")+1:0)+2;case"object":if(null==r||r instanceof h||r instanceof p||"MinKey"===r._bsontype||"MaxKey"===r._bsontype)return(null!=t?e.byteLength(t,"utf8")+1:0)+1;if(r instanceof a||"ObjectID"===r._bsontype||"ObjectId"===r._bsontype)return(null!=t?e.byteLength(t,"utf8")+1:0)+13;if(r instanceof Date||_(r))return(null!=t?e.byteLength(t,"utf8")+1:0)+9;if(void 0!==e&&e.isBuffer(r))return(null!=t?e.byteLength(t,"utf8")+1:0)+6+r.length;if(r instanceof i||r instanceof o||r instanceof s||"Long"===r._bsontype||"Double"===r._bsontype||"Timestamp"===r._bsontype)return(null!=t?e.byteLength(t,"utf8")+1:0)+9;if(r instanceof f||"Decimal128"===r._bsontype)return(null!=t?e.byteLength(t,"utf8")+1:0)+17;if(r instanceof l||"Code"===r._bsontype)return null!=r.scope&&Object.keys(r.scope).length>0?(null!=t?e.byteLength(t,"utf8")+1:0)+1+4+4+e.byteLength(r.code.toString(),"utf8")+1+m(r.scope,g,O):(null!=t?e.byteLength(t,"utf8")+1:0)+1+4+e.byteLength(r.code.toString(),"utf8")+1;if(r instanceof d||"Binary"===r._bsontype)return r.sub_type===d.SUBTYPE_BYTE_ARRAY?(null!=t?e.byteLength(t,"utf8")+1:0)+(r.position+1+4+1+4):(null!=t?e.byteLength(t,"utf8")+1:0)+(r.position+1+4+1);if(r instanceof u||"Symbol"===r._bsontype)return(null!=t?e.byteLength(t,"utf8")+1:0)+e.byteLength(r.value,"utf8")+4+1+1;if(r instanceof y||"DBRef"===r._bsontype){var S={$ref:r.namespace,$id:r.oid};return null!=r.db&&(S.$db=r.db),(null!=t?e.byteLength(t,"utf8")+1:0)+1+m(S,g,O)}return r instanceof RegExp||"[object RegExp]"===Object.prototype.toString.call(r)?(null!=t?e.byteLength(t,"utf8")+1:0)+1+e.byteLength(r.source,"utf8")+1+(r.global?1:0)+(r.ignoreCase?1:0)+(r.multiline?1:0)+1:r instanceof c||"BSONRegExp"===r._bsontype?(null!=t?e.byteLength(t,"utf8")+1:0)+1+e.byteLength(r.pattern,"utf8")+1+e.byteLength(r.options,"utf8")+1:(null!=t?e.byteLength(t,"utf8")+1:0)+m(r,g,O)+1;case"function":if(r instanceof RegExp||"[object RegExp]"===Object.prototype.toString.call(r)||"[object RegExp]"===String.call(r))return(null!=t?e.byteLength(t,"utf8")+1:0)+1+e.byteLength(r.source,"utf8")+1+(r.global?1:0)+(r.ignoreCase?1:0)+(r.multiline?1:0)+1;if(g&&null!=r.scope&&Object.keys(r.scope).length>0)return(null!=t?e.byteLength(t,"utf8")+1:0)+1+4+4+e.byteLength(v(r),"utf8")+1+m(r.scope,g,O);if(g)return(null!=t?e.byteLength(t,"utf8")+1:0)+1+4+e.byteLength(v(r),"utf8")+1}return 0}var b={BSON_INT32_MAX:2147483647,BSON_INT32_MIN:-2147483648,JS_INT_MAX:9007199254740992,JS_INT_MIN:-9007199254740992};t.exports=m}).call(this,r(1).Buffer)},function(t,e,r){"use strict";
/*!
 * ignore
 */t.exports=r(33).Decimal128},function(t,e,r){"use strict";
/*!
 * [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) ObjectId
 * @constructor NodeMongoDbObjectId
 * @see ObjectId
 */var n=r(33).ObjectID;
/*!
 * Getter for convenience with populate, see gh-6115
 */Object.defineProperty(n.prototype,"_id",{enumerable:!1,configurable:!0,get:function(){return this}}),
/*!
 * ignore
 */
t.exports=n},function(t,e,r){"use strict";
/*!
 * ignore
 */t.exports=function(){}},function(t,e,r){"use strict";
/*!
 * Dependencies
 */var n=r(110).ctor("require","modify","init","default","ignore");t.exports=function(){this.strictMode=void 0,this.selected=void 0,this.shardval=void 0,this.saveError=void 0,this.validationError=void 0,this.adhocPaths=void 0,this.removing=void 0,this.inserting=void 0,this.saving=void 0,this.version=void 0,this.getters={},this._id=void 0,this.populate=void 0,this.populated=void 0,this.wasPopulated=!1,this.scope=void 0,this.activePaths=new n,this.pathsToScopes={},this.cachedRequired={},this.session=null,this.$setCalled=new Set,this.ownerDocument=void 0,this.fullPath=void 0}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(2),i=t.exports=function(){};
/*!
 * StateMachine represents a minimal `interface` for the
 * constructors it builds via StateMachine.ctor(...).
 *
 * @api private
 */
/*!
 * StateMachine.ctor('state1', 'state2', ...)
 * A factory method for subclassing StateMachine.
 * The arguments are a list of states. For each state,
 * the constructor's prototype gets state transition
 * methods named after each state. These transition methods
 * place their path argument into the given state.
 *
 * @param {String} state
 * @param {String} [state]
 * @return {Function} subclass constructor
 * @private
 */
i.ctor=function(){var t=n.args(arguments),e=function(){i.apply(this,arguments),this.paths={},this.states={},this.stateNames=t;for(var e=t.length,r=void 0;e--;)r=t[e],this.states[r]={}};return e.prototype=new i,t.forEach(function(t){e.prototype[t]=function(e){this._changeState(e,t)}}),e},
/*!
 * This function is wrapped by the state change functions:
 *
 * - `require(path)`
 * - `modify(path)`
 * - `init(path)`
 *
 * @api private
 */
i.prototype._changeState=function(t,e){var r=this.states[this.paths[t]];r&&delete r[t],this.paths[t]=e,this.states[e][t]=!0},
/*!
 * ignore
 */
i.prototype.clear=function(t){for(var e=Object.keys(this.states[t]),r=e.length,n=void 0;r--;)n=e[r],delete this.states[t][n],delete this.paths[n]},
/*!
 * Checks to see if at least one path is in the states passed in via `arguments`
 * e.g., this.some('required', 'inited')
 *
 * @param {String} state that we want to check for.
 * @private
 */
i.prototype.some=function(){var t=this,e=arguments.length?arguments:this.stateNames;return Array.prototype.some.call(e,function(e){return Object.keys(t.states[e]).length})},
/*!
 * This function builds the functions that get assigned to `forEach` and `map`,
 * since both of those methods share a lot of the same logic.
 *
 * @param {String} iterMethod is either 'forEach' or 'map'
 * @return {Function}
 * @api private
 */
i.prototype._iter=function(t){return function(){var e=arguments.length,r=n.args(arguments,0,e-1),i=arguments[e-1];r.length||(r=this.stateNames);var o=this;return r.reduce(function(t,e){return t.concat(Object.keys(o.states[e]))},[])[t](function(t,e,r){return i(t,e,r)})}},
/*!
 * Iterates over the paths that belong to one of the parameter states.
 *
 * The function profile can look like:
 * this.forEach(state1, fn);         // iterates over all paths in state1
 * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
 * this.forEach(fn);                 // iterates over all paths in all states
 *
 * @param {String} [state]
 * @param {String} [state]
 * @param {Function} callback
 * @private
 */
i.prototype.forEach=function(){return this.forEach=this._iter("forEach"),this.forEach.apply(this,arguments)},
/*!
 * Maps over the paths that belong to one of the parameter states.
 *
 * The function profile can look like:
 * this.forEach(state1, fn);         // iterates over all paths in state1
 * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
 * this.forEach(fn);                 // iterates over all paths in all states
 *
 * @param {String} [state]
 * @param {String} [state]
 * @param {Function} callback
 * @return {Array}
 * @private
 */
i.prototype.map=function(){return this.map=this._iter("map"),this.map.apply(this,arguments)}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=1e3,o=60*i,s=60*o,a=24*s,u=7*a,c=365.25*a;function l(t,e,r,n){var i=e>=1.5*r;return Math.round(t/r)+" "+n+(i?"s":"")}t.exports=function(t,e){e=e||{};var r=void 0===t?"undefined":n(t);if("string"===r&&t.length>0)return function(t){if((t=String(t)).length>100)return;var e=/^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(t);if(!e)return;var r=parseFloat(e[1]);switch((e[2]||"ms").toLowerCase()){case"years":case"year":case"yrs":case"yr":case"y":return r*c;case"weeks":case"week":case"w":return r*u;case"days":case"day":case"d":return r*a;case"hours":case"hour":case"hrs":case"hr":case"h":return r*s;case"minutes":case"minute":case"mins":case"min":case"m":return r*o;case"seconds":case"second":case"secs":case"sec":case"s":return r*i;case"milliseconds":case"millisecond":case"msecs":case"msec":case"ms":return r;default:return}}(t);if("number"===r&&isFinite(t))return e.long?function(t){var e=Math.abs(t);if(e>=a)return l(t,e,a,"day");if(e>=s)return l(t,e,s,"hour");if(e>=o)return l(t,e,o,"minute");if(e>=i)return l(t,e,i,"second");return t+" ms"}(t):function(t){var e=Math.abs(t);if(e>=a)return Math.round(t/a)+"d";if(e>=s)return Math.round(t/s)+"h";if(e>=o)return Math.round(t/o)+"m";if(e>=i)return Math.round(t/i)+"s";return t+"ms"}(t);throw new Error("val is not a non-empty string or a valid number. val="+JSON.stringify(t))}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=["__proto__","constructor","prototype"];
/*!
 * Returns the value passed to it.
 */
function o(t){return t}e.get=function(t,r,n,i){var s;"function"==typeof n&&(n.length<2?(i=n,n=void 0):(s=n,n=void 0)),i||(i=o);var a="string"==typeof t?t.split("."):t;if(!Array.isArray(a))throw new TypeError("Invalid `path`. Must be either string or array");for(var u,c=r,l=0;l<a.length;++l){if(u=a[l],Array.isArray(c)&&!/^\d+$/.test(u)){var f=a.slice(l);return[].concat(c).map(function(t){return t?e.get(f,t,n||s,i):i(void 0)})}if(s)c=s(c,u);else{var h=n&&c[n]?c[n]:c;c=h instanceof Map?h.get(u):h[u]}if(!c)return i(c)}return i(c)},e.has=function(t,e){var r="string"==typeof t?t.split("."):t;if(!Array.isArray(r))throw new TypeError("Invalid `path`. Must be either string or array");for(var i=r.length,o=e,s=0;s<i;++s){if(null==o||"object"!==(void 0===o?"undefined":n(o))||!(r[s]in o))return!1;o=o[r[s]]}return!0},e.unset=function(t,e){var r="string"==typeof t?t.split("."):t;if(!Array.isArray(r))throw new TypeError("Invalid `path`. Must be either string or array");for(var o=r.length,s=e,a=0;a<o;++a){if(null==s||"object"!==(void 0===s?"undefined":n(s))||!(r[a]in s))return!1;if(-1!==i.indexOf(r[a]))return!1;if(a===o-1)return delete s[r[a]],!0;s=s instanceof Map?s.get(r[a]):s[r[a]]}return!0},e.set=function(t,r,n,s,a,u){var c;"function"==typeof s&&(s.length<2?(a=s,s=void 0):(c=s,s=void 0)),a||(a=o);var l="string"==typeof t?t.split("."):t;if(!Array.isArray(l))throw new TypeError("Invalid `path`. Must be either string or array");if(null!=n){for(var f=0;f<l.length;++f)if(-1!==i.indexOf(l[f]))return;for(var h,p=u||/\$/.test(t)&&!1!==u,y=n,d=(f=0,l.length-1);f<d;++f)if("$"!=(h=l[f])){if(Array.isArray(y)&&!/^\d+$/.test(h)){var v=l.slice(f);if(!p&&Array.isArray(r))for(var _=0;_<y.length&&_<r.length;++_)e.set(v,r[_],y[_],s||c,a,p);else for(_=0;_<y.length;++_)e.set(v,r,y[_],s||c,a,p);return}if(c)y=c(y,h);else{var m=s&&y[s]?y[s]:y;y=m instanceof Map?m.get(h):m[h]}if(!y)return}else if(f==d-1)break;if(h=l[d],s&&y[s]&&(y=y[s]),Array.isArray(y)&&!/^\d+$/.test(h))if(!p&&Array.isArray(r))!
/*!
 * Recursively set nested arrays
 */
function t(e,r,n,i,o,s){for(var a,u=0;u<e.length&&u<r.length;++u)a=e[u],Array.isArray(a)&&Array.isArray(r[u])?t(a,r[u],n,i,o,s):a&&(i?i(a,n,s(r[u])):(a[o]&&(a=a[o]),a[n]=s(r[u])))}(y,r,h,c,s,a);else for(_=0;_<y.length;++_)item=y[_],item&&(c?c(item,h,a(r)):(item[s]&&(item=item[s]),item[h]=a(r)));else c?c(y,h,a(r)):y instanceof Map?y.set(h,a(r)):y[h]=a(r)}}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};var i=r(46);t.exports=function t(e){if(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this._docs={},null!=e&&(e=i(e),Object.assign(this,e),"object"===n(e.subPopulate)&&(this.populate=e.subPopulate),null!=e.perDocumentLimit&&null!=e.limit))throw new Error("Can not use `limit` and `perDocumentLimit` at the same time. Path: `"+e.path+"`.")}},function(t,e,r){"use strict";
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/var n=Object.getOwnPropertySymbols,i=Object.prototype.hasOwnProperty,o=Object.prototype.propertyIsEnumerable;t.exports=function(){try{if(!Object.assign)return!1;var t=new String("abc");if(t[5]="de","5"===Object.getOwnPropertyNames(t)[0])return!1;for(var e={},r=0;r<10;r++)e["_"+String.fromCharCode(r)]=r;if("0123456789"!==Object.getOwnPropertyNames(e).map(function(t){return e[t]}).join(""))return!1;var n={};return"abcdefghijklmnopqrst".split("").forEach(function(t){n[t]=t}),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},n)).join("")}catch(t){return!1}}()?Object.assign:function(t,e){for(var r,s,a=function(t){if(null===t||void 0===t)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(t)}(t),u=1;u<arguments.length;u++){for(var c in r=Object(arguments[u]))i.call(r,c)&&(a[c]=r[c]);if(n){s=n(r);for(var l=0;l<s.length;l++)o.call(r,s[l])&&(a[s[l]]=r[s[l]])}}return a}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(62),o=r(21),s=r(3),a=r(67),u=r(117)("mquery");function c(t,e){if(!(this instanceof c))return new c(t,e);var r=this.constructor.prototype;this.op=r.op||void 0,this.options=Object.assign({},r.options),this._conditions=r._conditions?a.clone(r._conditions):{},this._fields=r._fields?a.clone(r._fields):void 0,this._update=r._update?a.clone(r._update):void 0,this._path=r._path||void 0,this._distinct=r._distinct||void 0,this._collection=r._collection||void 0,this._traceFunction=r._traceFunction||void 0,e&&this.setOptions(e),t&&(t.find&&t.remove&&t.update?this.collection(t):this.find(t))}var l="$geoWithin";Object.defineProperty(c,"use$geoWithin",{get:function(){return"$geoWithin"==l},set:function(t){l=!0===t?"$geoWithin":"$within"}}),c.prototype.toConstructor=function(){function t(e,r){if(!(this instanceof t))return new t(e,r);c.call(this,e,r)}a.inherits(t,c);var e=t.prototype;return e.options={},e.setOptions(this.options),e.op=this.op,e._conditions=a.clone(this._conditions),e._fields=a.clone(this._fields),e._update=a.clone(this._update),e._path=this._path,e._distinct=this._distinct,e._collection=this._collection,e._traceFunction=this._traceFunction,t},c.prototype.setOptions=function(t){if(!t||!a.isObject(t))return this;for(var e,r=a.keys(t),n=0;n<r.length;++n)if("function"==typeof this[e=r[n]]){var i=a.isArray(t[e])?t[e]:[t[e]];this[e].apply(this,i)}else this.options[e]=t[e];return this},c.prototype.collection=function(t){return this._collection=new c.Collection(t),this},c.prototype.collation=function(t){return this.options.collation=t,this},c.prototype.$where=function(t){return this._conditions.$where=t,this},c.prototype.where=function(){if(!arguments.length)return this;this.op||(this.op="find");var t=n(arguments[0]);if("string"==t)return this._path=arguments[0],2===arguments.length&&(this._conditions[this._path]=arguments[1]),this;if("object"==t&&!Array.isArray(arguments[0]))return this.merge(arguments[0]);throw new TypeError("path must be a string or object")},c.prototype.equals=function(t){this._ensurePath("equals");var e=this._path;return this._conditions[e]=t,this},c.prototype.eq=function(t){this._ensurePath("eq");var e=this._path;return this._conditions[e]=t,this},c.prototype.or=function(t){var e=this._conditions.$or||(this._conditions.$or=[]);return a.isArray(t)||(t=[t]),e.push.apply(e,t),this},c.prototype.nor=function(t){var e=this._conditions.$nor||(this._conditions.$nor=[]);return a.isArray(t)||(t=[t]),e.push.apply(e,t),this},c.prototype.and=function(t){var e=this._conditions.$and||(this._conditions.$and=[]);return Array.isArray(t)||(t=[t]),e.push.apply(e,t),this},
/*!
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */
"gt gte lt lte ne in nin all regex size maxDistance minDistance".split(" ").forEach(function(t){c.prototype[t]=function(){var e,r;return 1===arguments.length?(this._ensurePath(t),r=arguments[0],e=this._path):(r=arguments[1],e=arguments[0]),(null===this._conditions[e]||"object"===n(this._conditions[e])?this._conditions[e]:this._conditions[e]={})["$"+t]=r,this}}),c.prototype.mod=function(){var t,e;return 1===arguments.length?(this._ensurePath("mod"),t=arguments[0],e=this._path):2!==arguments.length||a.isArray(arguments[1])?3===arguments.length?(t=i(arguments,1),e=arguments[0]):(t=arguments[1],e=arguments[0]):(this._ensurePath("mod"),t=i(arguments),e=this._path),(this._conditions[e]||(this._conditions[e]={})).$mod=t,this},c.prototype.exists=function(){var t,e;return 0===arguments.length?(this._ensurePath("exists"),t=this._path,e=!0):1===arguments.length?"boolean"==typeof arguments[0]?(this._ensurePath("exists"),t=this._path,e=arguments[0]):(t=arguments[0],e=!0):2===arguments.length&&(t=arguments[0],e=arguments[1]),(this._conditions[t]||(this._conditions[t]={})).$exists=e,this},c.prototype.elemMatch=function(){if(null==arguments[0])throw new TypeError("Invalid argument");var t,e,r;if("function"==typeof arguments[0])this._ensurePath("elemMatch"),e=this._path,t=arguments[0];else if(a.isObject(arguments[0]))this._ensurePath("elemMatch"),e=this._path,r=arguments[0];else if("function"==typeof arguments[1])e=arguments[0],t=arguments[1];else{if(!arguments[1]||!a.isObject(arguments[1]))throw new TypeError("Invalid argument");e=arguments[0],r=arguments[1]}return t&&(t(r=new c),r=r._conditions),(this._conditions[e]||(this._conditions[e]={})).$elemMatch=r,this},c.prototype.within=function(){if(this._ensurePath("within"),this._geoComparison=l,0===arguments.length)return this;if(2===arguments.length)return this.box.apply(this,arguments);if(2<arguments.length)return this.polygon.apply(this,arguments);var t=arguments[0];if(!t)throw new TypeError("Invalid argument");if(t.center)return this.circle(t);if(t.box)return this.box.apply(this,t.box);if(t.polygon)return this.polygon.apply(this,t.polygon);if(t.type&&t.coordinates)return this.geometry(t);throw new TypeError("Invalid argument")},c.prototype.box=function(){var t,e;if(3===arguments.length)t=arguments[0],e=[arguments[1],arguments[2]];else{if(2!==arguments.length)throw new TypeError("Invalid argument");this._ensurePath("box"),t=this._path,e=[arguments[0],arguments[1]]}return(this._conditions[t]||(this._conditions[t]={}))[this._geoComparison||l]={$box:e},this},c.prototype.polygon=function(){var t,e;return"string"==typeof arguments[0]?(e=arguments[0],t=i(arguments,1)):(this._ensurePath("polygon"),e=this._path,t=i(arguments)),(this._conditions[e]||(this._conditions[e]={}))[this._geoComparison||l]={$polygon:t},this},c.prototype.circle=function(){var t,e;if(1===arguments.length)this._ensurePath("circle"),t=this._path,e=arguments[0];else{if(2!==arguments.length)throw new TypeError("Invalid argument");t=arguments[0],e=arguments[1]}if(!("radius"in e&&e.center))throw new Error("center and radius are required");var r=this._conditions[t]||(this._conditions[t]={}),n=e.spherical?"$centerSphere":"$center",i=this._geoComparison||l;return r[i]={},r[i][n]=[e.center,e.radius],"unique"in e&&(r[i].$uniqueDocs=!!e.unique),this},c.prototype.near=function(){var t,e;if(this._geoComparison="$near",0===arguments.length)return this;if(1===arguments.length)this._ensurePath("near"),t=this._path,e=arguments[0];else{if(2!==arguments.length)throw new TypeError("Invalid argument");t=arguments[0],e=arguments[1]}if(!e.center)throw new Error("center is required");var r=this._conditions[t]||(this._conditions[t]={}),n=e.spherical?"$nearSphere":"$near";if(Array.isArray(e.center)){r[n]=e.center;var i="maxDistance"in e?e.maxDistance:null;null!=i&&(r.$maxDistance=i),null!=e.minDistance&&(r.$minDistance=e.minDistance)}else{if("Point"!=e.center.type||!Array.isArray(e.center.coordinates))throw new Error(s.format("Invalid GeoJSON specified for %s",n));r[n]={$geometry:e.center},"maxDistance"in e&&(r[n].$maxDistance=e.maxDistance),"minDistance"in e&&(r[n].$minDistance=e.minDistance)}return this},c.prototype.intersects=function(){if(this._ensurePath("intersects"),this._geoComparison="$geoIntersects",0===arguments.length)return this;var t=arguments[0];if(null!=t&&t.type&&t.coordinates)return this.geometry(t);throw new TypeError("Invalid argument")},c.prototype.geometry=function(){if("$within"!=this._geoComparison&&"$geoWithin"!=this._geoComparison&&"$near"!=this._geoComparison&&"$geoIntersects"!=this._geoComparison)throw new Error("geometry() must come after `within()`, `intersects()`, or `near()");var t,e;if(1!==arguments.length)throw new TypeError("Invalid argument");if(this._ensurePath("geometry"),e=this._path,!(t=arguments[0]).type||!Array.isArray(t.coordinates))throw new TypeError("Invalid argument");return(this._conditions[e]||(this._conditions[e]={}))[this._geoComparison]={$geometry:t},this},c.prototype.select=function(){var t=arguments[0];if(!t)return this;if(1!==arguments.length)throw new Error("Invalid select: select only takes 1 argument");this._validate("select");var e,r,i=this._fields||(this._fields={}),o=void 0===t?"undefined":n(t);if(("string"==o||a.isArgumentsObject(t))&&"number"==typeof t.length||Array.isArray(t)){for("string"==o&&(t=t.split(/\s+/)),e=0,r=t.length;e<r;++e){var s=t[e];if(s){var u="-"==s[0]?0:1;0===u&&(s=s.substring(1)),i[s]=u}}return this}if(a.isObject(t)){var c=a.keys(t);for(e=0;e<c.length;++e)i[c[e]]=t[c[e]];return this}throw new TypeError("Invalid select() argument. Must be string or object.")},c.prototype.slice=function(){if(0===arguments.length)return this;var t,e;if(this._validate("slice"),1===arguments.length){var r=arguments[0];if("object"===(void 0===r?"undefined":n(r))&&!Array.isArray(r)){for(var o=Object.keys(r),s=o.length,a=0;a<s;++a)this.slice(o[a],r[o[a]]);return this}this._ensurePath("slice"),t=this._path,e=arguments[0]}else 2===arguments.length?"number"==typeof arguments[0]?(this._ensurePath("slice"),t=this._path,e=i(arguments)):(t=arguments[0],e=arguments[1]):3===arguments.length&&(t=arguments[0],e=i(arguments,1));return(this._fields||(this._fields={}))[t]={$slice:e},this},c.prototype.sort=function(t){if(!t)return this;var e,r,i;this._validate("sort");var o=void 0===t?"undefined":n(t);if(Array.isArray(t)){for(r=t.length,e=0;e<t.length;++e){if(!Array.isArray(t[e]))throw new Error("Invalid sort() argument, must be array of arrays");p(this.options,t[e][0],t[e][1])}return this}if(1===arguments.length&&"string"==o){for(r=(t=t.split(/\s+/)).length,e=0;e<r;++e)if(i=t[e]){var s="-"==i[0]?-1:1;-1===s&&(i=i.substring(1)),h(this.options,i,s)}return this}if(a.isObject(t)){var u=a.keys(t);for(e=0;e<u.length;++e)i=u[e],h(this.options,i,t[i]);return this}if("undefined"!=typeof Map&&t instanceof Map)return function(t,e){if(t.sort=t.sort||new Map,!(t.sort instanceof Map))throw new TypeError("Can't mix sort syntaxes. Use either array or object or map consistently");e.forEach(function(e,r){var n=String(e||1).toLowerCase();if(!(n=f[n]))throw new TypeError("Invalid sort value: < "+r+": "+e+" >");t.sort.set(r,n)})}
/*!
 * limit, skip, maxScan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */(this.options,t),this;throw new TypeError("Invalid sort() argument. Must be a string, object, or array.")};
/*!
 * @ignore
 */
var f={1:1,"-1":-1,asc:1,ascending:1,desc:-1,descending:-1};function h(t,e,r){if(Array.isArray(t.sort))throw new TypeError("Can't mix sort syntaxes. Use either array or object:\n- `.sort([['field', 1], ['test', -1]])`\n- `.sort({ field: 1, test: -1 })`");var n;if(r&&r.$meta)(n=t.sort||(t.sort={}))[e]={$meta:r.$meta};else{n=t.sort||(t.sort={});var i=String(r||1).toLowerCase();if(!(i=f[i]))throw new TypeError("Invalid sort value: { "+e+": "+r+" }");n[e]=i}}function p(t,e,r){if(t.sort=t.sort||[],!Array.isArray(t.sort))throw new TypeError("Can't mix sort syntaxes. Use either array or object:\n- `.sort([['field', 1], ['test', -1]])`\n- `.sort({ field: 1, test: -1 })`");var n=String(r||1).toLowerCase();if(!(n=f[n]))throw new TypeError("Invalid sort value: [ "+e+", "+r+" ]");t.sort.push([e,n])}
/*!
 * Internal helper for update, updateMany, updateOne
 */
function y(t,e,r,n,i,o,s){return t.op=e,c.canMerge(r)&&t.merge(r),n&&t._mergeUpdate(n),a.isObject(i)&&t.setOptions(i),o||s?!t._update||!t.options.overwrite&&0===a.keys(t._update).length?(s&&a.soon(s.bind(null,null,0)),t):(i=t._optionsForExec(),s||(i.safe=!1),r=t._conditions,n=t._updateForExec(),u("update",t._collection.collectionName,r,n,i),s=t._wrapCallback(e,s,{conditions:r,doc:n,options:i}),t._collection[e](r,n,i,a.tick(s)),t):t}["limit","skip","maxScan","batchSize","comment"].forEach(function(t){c.prototype[t]=function(e){return this._validate(t),this.options[t]=e,this}}),c.prototype.maxTime=c.prototype.maxTimeMS=function(t){return this._validate("maxTime"),this.options.maxTimeMS=t,this},c.prototype.snapshot=function(){return this._validate("snapshot"),this.options.snapshot=!arguments.length||!!arguments[0],this},c.prototype.hint=function(){if(0===arguments.length)return this;this._validate("hint");var t=arguments[0];if(a.isObject(t)){var e=this.options.hint||(this.options.hint={});for(var r in t)e[r]=t[r];return this}if("string"==typeof t)return this.options.hint=t,this;throw new TypeError("Invalid hint. "+t)},c.prototype.j=function(t){return this.options.j=t,this},c.prototype.slaveOk=function(t){return this.options.slaveOk=!arguments.length||!!t,this},c.prototype.read=c.prototype.setReadPreference=function(t){return arguments.length>1&&!c.prototype.read.deprecationWarningIssued&&(console.error("Deprecation warning: 'tags' argument is not supported anymore in Query.read() method. Please use mongodb.ReadPreference object instead."),c.prototype.read.deprecationWarningIssued=!0),this.options.readPreference=a.readPref(t),this},c.prototype.readConcern=c.prototype.r=function(t){return this.options.readConcern=a.readConcern(t),this},c.prototype.tailable=function(){return this._validate("tailable"),this.options.tailable=!arguments.length||!!arguments[0],this},c.prototype.writeConcern=c.prototype.w=function(t){return"object"===(void 0===t?"undefined":n(t))?(void 0!==t.j&&(this.options.j=t.j),void 0!==t.w&&(this.options.w=t.w),void 0!==t.wtimeout&&(this.options.wtimeout=t.wtimeout)):this.options.w="m"===t?"majority":t,this},c.prototype.wtimeout=c.prototype.wTimeout=function(t){return this.options.wtimeout=t,this},c.prototype.merge=function(t){if(!t)return this;if(!c.canMerge(t))throw new TypeError("Invalid argument. Expected instanceof mquery or plain object");return t instanceof c?(t._conditions&&a.merge(this._conditions,t._conditions),t._fields&&(this._fields||(this._fields={}),a.merge(this._fields,t._fields)),t.options&&(this.options||(this.options={}),a.merge(this.options,t.options)),t._update&&(this._update||(this._update={}),a.mergeClone(this._update,t._update)),t._distinct&&(this._distinct=t._distinct),this):(a.merge(this._conditions,t),this)},c.prototype.find=function(t,e){if(this.op="find","function"==typeof t?(e=t,t=void 0):c.canMerge(t)&&this.merge(t),!e)return this;var r=this._conditions,n=this._optionsForExec();return this.$useProjection?n.projection=this._fieldsForExec():n.fields=this._fieldsForExec(),u("find",this._collection.collectionName,r,n),e=this._wrapCallback("find",e,{conditions:r,options:n}),this._collection.find(r,n,a.tick(e)),this},c.prototype.cursor=function(t){if(this.op){if("find"!==this.op)throw new TypeError(".cursor only support .find method")}else this.find(t);var e=this._conditions,r=this._optionsForExec();return this.$useProjection?r.projection=this._fieldsForExec():r.fields=this._fieldsForExec(),u("findCursor",this._collection.collectionName,e,r),this._collection.findCursor(e,r)},c.prototype.findOne=function(t,e){if(this.op="findOne","function"==typeof t?(e=t,t=void 0):c.canMerge(t)&&this.merge(t),!e)return this;var r=this._conditions,n=this._optionsForExec();return this.$useProjection?n.projection=this._fieldsForExec():n.fields=this._fieldsForExec(),u("findOne",this._collection.collectionName,r,n),e=this._wrapCallback("findOne",e,{conditions:r,options:n}),this._collection.findOne(r,n,a.tick(e)),this},c.prototype.count=function(t,e){if(this.op="count",this._validate(),"function"==typeof t?(e=t,t=void 0):c.canMerge(t)&&this.merge(t),!e)return this;var r=this._conditions,n=this._optionsForExec();return u("count",this._collection.collectionName,r,n),e=this._wrapCallback("count",e,{conditions:r,options:n}),this._collection.count(r,n,a.tick(e)),this},c.prototype.distinct=function(t,e,r){if(this.op="distinct",this._validate(),!r){switch(void 0===e?"undefined":n(e)){case"function":r=e,"string"==typeof t&&(e=t,t=void 0);break;case"undefined":case"string":break;default:throw new TypeError("Invalid `field` argument. Must be string or function")}switch(void 0===t?"undefined":n(t)){case"function":r=t,t=e=void 0;break;case"string":e=t,t=void 0}}if("string"==typeof e&&(this._distinct=e),c.canMerge(t)&&this.merge(t),!r)return this;if(!this._distinct)throw new Error("No value for `distinct` has been declared");var i=this._conditions,o=this._optionsForExec();return u("distinct",this._collection.collectionName,i,o),r=this._wrapCallback("distinct",r,{conditions:i,options:o}),this._collection.distinct(this._distinct,i,o,a.tick(r)),this},c.prototype.update=function(t,e,r,i){var o;switch(arguments.length){case 3:"function"==typeof r&&(i=r,r=void 0);break;case 2:"function"==typeof e&&(i=e,e=t,t=void 0);break;case 1:switch(void 0===t?"undefined":n(t)){case"function":i=t,t=r=e=void 0;break;case"boolean":o=t,t=void 0;break;default:e=t,t=r=void 0}}return y(this,"update",t,e,r,o,i)},c.prototype.updateMany=function(t,e,r,i){var o;switch(arguments.length){case 3:"function"==typeof r&&(i=r,r=void 0);break;case 2:"function"==typeof e&&(i=e,e=t,t=void 0);break;case 1:switch(void 0===t?"undefined":n(t)){case"function":i=t,t=r=e=void 0;break;case"boolean":o=t,t=void 0;break;default:e=t,t=r=void 0}}return y(this,"updateMany",t,e,r,o,i)},c.prototype.updateOne=function(t,e,r,i){var o;switch(arguments.length){case 3:"function"==typeof r&&(i=r,r=void 0);break;case 2:"function"==typeof e&&(i=e,e=t,t=void 0);break;case 1:switch(void 0===t?"undefined":n(t)){case"function":i=t,t=r=e=void 0;break;case"boolean":o=t,t=void 0;break;default:e=t,t=r=void 0}}return y(this,"updateOne",t,e,r,o,i)},c.prototype.replaceOne=function(t,e,r,i){var o;switch(arguments.length){case 3:"function"==typeof r&&(i=r,r=void 0);break;case 2:"function"==typeof e&&(i=e,e=t,t=void 0);break;case 1:switch(void 0===t?"undefined":n(t)){case"function":i=t,t=r=e=void 0;break;case"boolean":o=t,t=void 0;break;default:e=t,t=r=void 0}}return this.setOptions({overwrite:!0}),y(this,"replaceOne",t,e,r,o,i)},c.prototype.remove=function(t,e){var r;if(this.op="remove","function"==typeof t?(e=t,t=void 0):c.canMerge(t)?this.merge(t):!0===t&&(r=t,t=void 0),!r&&!e)return this;var n=this._optionsForExec();e||(n.safe=!1);var i=this._conditions;return u("remove",this._collection.collectionName,i,n),e=this._wrapCallback("remove",e,{conditions:i,options:n}),this._collection.remove(i,n,a.tick(e)),this},c.prototype.deleteOne=function(t,e){var r;if(this.op="deleteOne","function"==typeof t?(e=t,t=void 0):c.canMerge(t)?this.merge(t):!0===t&&(r=t,t=void 0),!r&&!e)return this;var n=this._optionsForExec();e||(n.safe=!1),delete n.justOne;var i=this._conditions;return u("deleteOne",this._collection.collectionName,i,n),e=this._wrapCallback("deleteOne",e,{conditions:i,options:n}),this._collection.deleteOne(i,n,a.tick(e)),this},c.prototype.deleteMany=function(t,e){var r;if(this.op="deleteMany","function"==typeof t?(e=t,t=void 0):c.canMerge(t)?this.merge(t):!0===t&&(r=t,t=void 0),!r&&!e)return this;var n=this._optionsForExec();e||(n.safe=!1),delete n.justOne;var i=this._conditions;return u("deleteOne",this._collection.collectionName,i,n),e=this._wrapCallback("deleteOne",e,{conditions:i,options:n}),this._collection.deleteMany(i,n,a.tick(e)),this},c.prototype.findOneAndUpdate=function(t,e,r,n){switch(this.op="findOneAndUpdate",this._validate(),arguments.length){case 3:"function"==typeof r&&(n=r,r={});break;case 2:"function"==typeof e&&(n=e,e=t,t=void 0),r=void 0;break;case 1:"function"==typeof t?(n=t,t=r=e=void 0):(e=t,t=r=void 0)}return c.canMerge(t)&&this.merge(t),e&&this._mergeUpdate(e),r&&this.setOptions(r),n?this._findAndModify("update",n):this},c.prototype.findOneAndRemove=c.prototype.findOneAndDelete=function(t,e,r){return this.op="findOneAndRemove",this._validate(),"function"==typeof e?(r=e,e=void 0):"function"==typeof t&&(r=t,t=void 0),c.canMerge(t)&&this.merge(t),e&&this.setOptions(e),r?this._findAndModify("remove",r):this},c.prototype._findAndModify=function(t,e){o.equal("function",void 0===e?"undefined":n(e));var r,i=this._optionsForExec();if("remove"==t)i.remove=!0;else if("new"in i||(i.new=!0),"upsert"in i||(i.upsert=!1),!(r=this._updateForExec())){if(!i.upsert)return this.findOne(e);r={$set:{}}}null!=this._fieldsForExec()&&(this.$useProjection?i.projection=this._fieldsForExec():i.fields=this._fieldsForExec());var s=this._conditions;return u("findAndModify",this._collection.collectionName,s,r,i),e=this._wrapCallback("findAndModify",e,{conditions:s,doc:r,options:i}),this._collection.findAndModify(s,r,i,a.tick(e)),this},c.prototype._wrapCallback=function(t,e,r){var n=this._traceFunction||c.traceFunction;if(n){r.collectionName=this._collection.collectionName;var i=n&&n.call(null,t,r,this),o=(new Date).getTime();return function(t,r){if(i){var n=(new Date).getTime()-o;i.call(null,t,r,n)}e&&e.apply(null,arguments)}}return e},c.prototype.setTraceFunction=function(t){return this._traceFunction=t,this},c.prototype.exec=function(t,e){switch(void 0===t?"undefined":n(t)){case"function":e=t,t=null;break;case"string":this.op=t}o.ok(this.op,"Missing query type: (find, update, etc)"),"update"!=this.op&&"remove"!=this.op||e||(e=!0);var r=this;if("function"!=typeof e)return new c.Promise(function(t,e){r[r.op](function(r,n){r?e(r):t(n),t=e=null})});this[this.op](e)},c.prototype.thunk=function(){var t=this;return function(e){t.exec(e)}},c.prototype.then=function(t,e){var r=this;return new c.Promise(function(t,e){r.exec(function(r,n){r?e(r):t(n),t=e=null})}).then(t,e)},c.prototype.stream=function(t){if("find"!=this.op)throw new Error("stream() is only available for find");var e=this._conditions,r=this._optionsForExec();return this.$useProjection?r.projection=this._fieldsForExec():r.fields=this._fieldsForExec(),u("stream",this._collection.collectionName,e,r,t),this._collection.findStream(e,r,t)},c.prototype.selected=function(){return!!(this._fields&&Object.keys(this._fields).length>0)},c.prototype.selectedInclusively=function(){if(!this._fields)return!1;var t=Object.keys(this._fields);if(0===t.length)return!1;for(var e=0;e<t.length;++e){var r=t[e];if(0===this._fields[r])return!1;if(this._fields[r]&&"object"===n(this._fields[r])&&this._fields[r].$meta)return!1}return!0},c.prototype.selectedExclusively=function(){if(!this._fields)return!1;var t=Object.keys(this._fields);if(0===t.length)return!1;for(var e=0;e<t.length;++e){var r=t[e];if(0===this._fields[r])return!0}return!1},c.prototype._mergeUpdate=function(t){this._update||(this._update={}),t instanceof c?t._update&&a.mergeClone(this._update,t._update):a.mergeClone(this._update,t)},c.prototype._optionsForExec=function(){return a.clone(this.options)},c.prototype._fieldsForExec=function(){return a.clone(this._fields)},c.prototype._updateForExec=function(){for(var t=a.clone(this._update),e=a.keys(t),r=e.length,n={};r--;){var i=e[r];this.options.overwrite?n[i]=t[i]:"$"!==i[0]?(n.$set||(t.$set?n.$set=t.$set:n.$set={}),n.$set[i]=t[i],e.splice(r,1),~e.indexOf("$set")||e.push("$set")):"$set"===i&&n.$set||(n[i]=t[i])}return this._compiledUpdate=n,n},c.prototype._ensurePath=function(t){if(!this._path)throw new Error(t+"() must be used after where() when called with these arguments")},
/*!
 * Permissions
 */
c.permissions=r(120),c._isPermitted=function(t,e){var r=c.permissions[e];return!r||!0!==r[t]},c.prototype._validate=function(t){var e,r;if(void 0===t){if("function"!=typeof(r=c.permissions[this.op]))return!0;e=r(this)}else c._isPermitted(t,this.op)||(e=t);if(e)throw new Error(e+" cannot be used with "+this.op)},c.canMerge=function(t){return t instanceof c||a.isObject(t)},c.setGlobalTraceFunction=function(t){c.traceFunction=t},
/*!
 * Exports.
 */
c.utils=a,c.env=r(69),c.Collection=r(122),c.BaseCollection=r(28),c.Promise=r(124),t.exports=c},function(t,e,r){"use strict";(function(t,e){!function(t,r){if(!t.setImmediate){var n,i=1,o={},s=!1,a=t.document,u=Object.getPrototypeOf&&Object.getPrototypeOf(t);u=u&&u.setTimeout?u:t,"[object process]"==={}.toString.call(t.process)?n=function(t){e.nextTick(function(){l(t)})}:function(){if(t.postMessage&&!t.importScripts){var e=!0,r=t.onmessage;return t.onmessage=function(){e=!1},t.postMessage("","*"),t.onmessage=r,e}}()?function(){var e="setImmediate$"+Math.random()+"$",r=function(r){r.source===t&&"string"==typeof r.data&&0===r.data.indexOf(e)&&l(+r.data.slice(e.length))};t.addEventListener?t.addEventListener("message",r,!1):t.attachEvent("onmessage",r),n=function(r){t.postMessage(e+r,"*")}}():t.MessageChannel?function(){var t=new MessageChannel;t.port1.onmessage=function(t){l(t.data)},n=function(e){t.port2.postMessage(e)}}():a&&"onreadystatechange"in a.createElement("script")?function(){var t=a.documentElement;n=function(e){var r=a.createElement("script");r.onreadystatechange=function(){l(e),r.onreadystatechange=null,t.removeChild(r),r=null},t.appendChild(r)}}():n=function(t){setTimeout(l,0,t)},u.setImmediate=function(t){"function"!=typeof t&&(t=new Function(""+t));for(var e=new Array(arguments.length-1),r=0;r<e.length;r++)e[r]=arguments[r+1];var s={callback:t,args:e};return o[i]=s,n(i),i++},u.clearImmediate=c}function c(t){delete o[t]}function l(t){if(s)setTimeout(l,0,t);else{var e=o[t];if(e){s=!0;try{!function(t){var e=t.callback,n=t.args;switch(n.length){case 0:e();break;case 1:e(n[0]);break;case 2:e(n[0],n[1]);break;case 3:e(n[0],n[1],n[2]);break;default:e.apply(r,n)}}(e)}finally{c(t),s=!1}}}}}("undefined"==typeof self?void 0===t?void 0:t:self)}).call(this,r(11),r(8))},function(t,e,r){"use strict";(function(n){var i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};function o(){var t;try{t=e.storage.debug}catch(t){}return!t&&void 0!==n&&"env"in n&&(t=n.env.DEBUG),t}(e=t.exports=r(118)).log=function(){return"object"===("undefined"==typeof console?"undefined":i(console))&&console.log&&Function.prototype.apply.call(console.log,console,arguments)},e.formatArgs=function(t){var r=this.useColors;if(t[0]=(r?"%c":"")+this.namespace+(r?" %c":" ")+t[0]+(r?"%c ":" ")+"+"+e.humanize(this.diff),!r)return;var n="color: "+this.color;t.splice(1,0,n,"color: inherit");var i=0,o=0;t[0].replace(/%[a-zA-Z%]/g,function(t){"%%"!==t&&"%c"===t&&(o=++i)}),t.splice(o,0,n)},e.save=function(t){try{null==t?e.storage.removeItem("debug"):e.storage.debug=t}catch(t){}},e.load=o,e.useColors=function(){if("undefined"!=typeof window&&window.process&&"renderer"===window.process.type)return!0;if("undefined"!=typeof navigator&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))return!1;return"undefined"!=typeof document&&document.documentElement&&document.documentElement.style&&document.documentElement.style.WebkitAppearance||"undefined"!=typeof window&&window.console&&(window.console.firebug||window.console.exception&&window.console.table)||"undefined"!=typeof navigator&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)&&parseInt(RegExp.$1,10)>=31||"undefined"!=typeof navigator&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)},e.storage="undefined"!=typeof chrome&&void 0!==chrome.storage?chrome.storage.local:function(){try{return window.localStorage}catch(t){}}(),e.colors=["#0000CC","#0000FF","#0033CC","#0033FF","#0066CC","#0066FF","#0099CC","#0099FF","#00CC00","#00CC33","#00CC66","#00CC99","#00CCCC","#00CCFF","#3300CC","#3300FF","#3333CC","#3333FF","#3366CC","#3366FF","#3399CC","#3399FF","#33CC00","#33CC33","#33CC66","#33CC99","#33CCCC","#33CCFF","#6600CC","#6600FF","#6633CC","#6633FF","#66CC00","#66CC33","#9900CC","#9900FF","#9933CC","#9933FF","#99CC00","#99CC33","#CC0000","#CC0033","#CC0066","#CC0099","#CC00CC","#CC00FF","#CC3300","#CC3333","#CC3366","#CC3399","#CC33CC","#CC33FF","#CC6600","#CC6633","#CC9900","#CC9933","#CCCC00","#CCCC33","#FF0000","#FF0033","#FF0066","#FF0099","#FF00CC","#FF00FF","#FF3300","#FF3333","#FF3366","#FF3399","#FF33CC","#FF33FF","#FF6600","#FF6633","#FF9900","#FF9933","#FFCC00","#FFCC33"],e.formatters.j=function(t){try{return JSON.stringify(t)}catch(t){return"[UnexpectedJSONParseError]: "+t.message}},e.enable(o())}).call(this,r(8))},function(t,e,r){"use strict";function n(t){var r;function n(){if(n.enabled){var t=n,i=+new Date,o=i-(r||i);t.diff=o,t.prev=r,t.curr=i,r=i;for(var s=new Array(arguments.length),a=0;a<s.length;a++)s[a]=arguments[a];s[0]=e.coerce(s[0]),"string"!=typeof s[0]&&s.unshift("%O");var u=0;s[0]=s[0].replace(/%([a-zA-Z%])/g,function(r,n){if("%%"===r)return r;u++;var i=e.formatters[n];if("function"==typeof i){var o=s[u];r=i.call(t,o),s.splice(u,1),u--}return r}),e.formatArgs.call(t,s),(n.log||e.log||console.log.bind(console)).apply(t,s)}}return n.namespace=t,n.enabled=e.enabled(t),n.useColors=e.useColors(),n.color=function(t){var r,n=0;for(r in t)n=(n<<5)-n+t.charCodeAt(r),n|=0;return e.colors[Math.abs(n)%e.colors.length]}(t),n.destroy=i,"function"==typeof e.init&&e.init(n),e.instances.push(n),n}function i(){var t=e.instances.indexOf(this);return-1!==t&&(e.instances.splice(t,1),!0)}(e=t.exports=n.debug=n.default=n).coerce=function(t){return t instanceof Error?t.stack||t.message:t},e.disable=function(){e.enable("")},e.enable=function(t){var r;e.save(t),e.names=[],e.skips=[];var n=("string"==typeof t?t:"").split(/[\s,]+/),i=n.length;for(r=0;r<i;r++)n[r]&&("-"===(t=n[r].replace(/\*/g,".*?"))[0]?e.skips.push(new RegExp("^"+t.substr(1)+"$")):e.names.push(new RegExp("^"+t+"$")));for(r=0;r<e.instances.length;r++){var o=e.instances[r];o.enabled=e.enabled(o.namespace)}},e.enabled=function(t){if("*"===t[t.length-1])return!0;var r,n;for(r=0,n=e.skips.length;r<n;r++)if(e.skips[r].test(t))return!1;for(r=0,n=e.names.length;r<n;r++)if(e.names[r].test(t))return!0;return!1},e.humanize=r(119),e.instances=[],e.names=[],e.skips=[],e.formatters={}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=1e3,o=60*i,s=60*o,a=24*s,u=365.25*a;function c(t,e,r){if(!(t<e))return t<1.5*e?Math.floor(t/e)+" "+r:Math.ceil(t/e)+" "+r+"s"}t.exports=function(t,e){e=e||{};var r=void 0===t?"undefined":n(t);if("string"===r&&t.length>0)return function(t){if((t=String(t)).length>100)return;var e=/^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(t);if(!e)return;var r=parseFloat(e[1]);switch((e[2]||"ms").toLowerCase()){case"years":case"year":case"yrs":case"yr":case"y":return r*u;case"days":case"day":case"d":return r*a;case"hours":case"hour":case"hrs":case"hr":case"h":return r*s;case"minutes":case"minute":case"mins":case"min":case"m":return r*o;case"seconds":case"second":case"secs":case"sec":case"s":return r*i;case"milliseconds":case"millisecond":case"msecs":case"msec":case"ms":return r;default:return}}(t);if("number"===r&&!1===isNaN(t))return e.long?function(t){return c(t,a,"day")||c(t,s,"hour")||c(t,o,"minute")||c(t,i,"second")||t+" ms"}(t):function(t){if(t>=a)return Math.round(t/a)+"d";if(t>=s)return Math.round(t/s)+"h";if(t>=o)return Math.round(t/o)+"m";if(t>=i)return Math.round(t/i)+"s";return t+"ms"}(t);throw new Error("val is not a non-empty string or a valid number. val="+JSON.stringify(t))}},function(t,e,r){"use strict";var n=e;n.distinct=function(t){return t._fields&&Object.keys(t._fields).length>0?"field selection and slice":(Object.keys(n.distinct).every(function(r){return!t.options[r]||(e=r,!1)}),e);var e},n.distinct.select=n.distinct.slice=n.distinct.sort=n.distinct.limit=n.distinct.skip=n.distinct.batchSize=n.distinct.comment=n.distinct.maxScan=n.distinct.snapshot=n.distinct.hint=n.distinct.tailable=!0,n.findOneAndUpdate=n.findOneAndRemove=function(t){var e;return Object.keys(n.findOneAndUpdate).every(function(r){return!t.options[r]||(e=r,!1)}),e},n.findOneAndUpdate.limit=n.findOneAndUpdate.skip=n.findOneAndUpdate.batchSize=n.findOneAndUpdate.maxScan=n.findOneAndUpdate.snapshot=n.findOneAndUpdate.hint=n.findOneAndUpdate.tailable=n.findOneAndUpdate.comment=!0,n.count=function(t){return t._fields&&Object.keys(t._fields).length>0?"field selection and slice":(Object.keys(n.count).every(function(r){return!t.options[r]||(e=r,!1)}),e);var e},n.count.slice=n.count.batchSize=n.count.comment=n.count.maxScan=n.count.snapshot=n.count.tailable=!0},function(t,e,r){"use strict";t.exports=function(t){return t.webpackPolyfill||(t.deprecate=function(){},t.paths=[],t.children||(t.children=[]),Object.defineProperty(t,"loaded",{enumerable:!0,get:function(){return t.l}}),Object.defineProperty(t,"id",{enumerable:!0,get:function(){return t.i}}),t.webpackPolyfill=1),t}},function(t,e,r){"use strict";var n=r(69);if("unknown"==n.type)throw new Error("Unknown environment");t.exports=n.isNode?r(123):(n.isMongo,r(28))},function(t,e,r){"use strict";var n=r(28);function i(t){this.collection=t,this.collectionName=t.collectionName}r(67).inherits(i,n),i.prototype.find=function(t,e,r){this.collection.find(t,e,function(t,e){if(t)return r(t);try{e.toArray(r)}catch(t){r(t)}})},i.prototype.findOne=function(t,e,r){this.collection.findOne(t,e,r)},i.prototype.count=function(t,e,r){this.collection.count(t,e,r)},i.prototype.distinct=function(t,e,r,n){this.collection.distinct(t,e,r,n)},i.prototype.update=function(t,e,r,n){this.collection.update(t,e,r,n)},i.prototype.updateMany=function(t,e,r,n){this.collection.updateMany(t,e,r,n)},i.prototype.updateOne=function(t,e,r,n){this.collection.updateOne(t,e,r,n)},i.prototype.replaceOne=function(t,e,r,n){this.collection.replaceOne(t,e,r,n)},i.prototype.deleteOne=function(t,e,r){this.collection.deleteOne(t,e,r)},i.prototype.deleteMany=function(t,e,r){this.collection.deleteMany(t,e,r)},i.prototype.remove=function(t,e,r){this.collection.remove(t,e,r)},i.prototype.findAndModify=function(t,e,r,n){var i=Array.isArray(r.sort)?r.sort:[];this.collection.findAndModify(t,i,e,r,n)},i.prototype.findStream=function(t,e,r){return this.collection.find(t,e).stream(r)},i.prototype.findCursor=function(t,e){return this.collection.find(t,e)},t.exports=i},function(t,e,r){"use strict";(function(r,n,i){var o,s,a,u="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};!function(r){"object"==u(e)&&void 0!==t?t.exports=r():(s=[],void 0===(a="function"==typeof(o=r)?o.apply(e,s):o)||(t.exports=a))}(function(){var t,e,o;return function t(e,r,n){function i(s,a){if(!r[s]){if(!e[s]){var u="function"==typeof _dereq_&&_dereq_;if(!a&&u)return u(s,!0);if(o)return o(s,!0);var c=new Error("Cannot find module '"+s+"'");throw c.code="MODULE_NOT_FOUND",c}var l=r[s]={exports:{}};e[s][0].call(l.exports,function(t){var r=e[s][1][t];return i(r||t)},l,l.exports,t,e,r,n)}return r[s].exports}for(var o="function"==typeof _dereq_&&_dereq_,s=0;s<n.length;s++)i(n[s]);return i}({1:[function(t,e,r){e.exports=function(t){var e=t._SomePromiseArray;function r(t){var r=new e(t),n=r.promise();return r.setHowMany(1),r.setUnwrap(),r.init(),n}t.any=function(t){return r(t)},t.prototype.any=function(){return r(this)}}},{}],2:[function(t,e,n){var i;try{throw new Error}catch(t){i=t}var o=t("./schedule"),s=t("./queue"),a=t("./util");function u(){this._customScheduler=!1,this._isTickUsed=!1,this._lateQueue=new s(16),this._normalQueue=new s(16),this._haveDrainedQueues=!1,this._trampolineEnabled=!0;var t=this;this.drainQueues=function(){t._drainQueues()},this._schedule=o}function c(t,e,r){this._lateQueue.push(t,e,r),this._queueTick()}function l(t,e,r){this._normalQueue.push(t,e,r),this._queueTick()}function f(t){this._normalQueue._pushOne(t),this._queueTick()}u.prototype.setScheduler=function(t){var e=this._schedule;return this._schedule=t,this._customScheduler=!0,e},u.prototype.hasCustomScheduler=function(){return this._customScheduler},u.prototype.enableTrampoline=function(){this._trampolineEnabled=!0},u.prototype.disableTrampolineIfNecessary=function(){a.hasDevTools&&(this._trampolineEnabled=!1)},u.prototype.haveItemsQueued=function(){return this._isTickUsed||this._haveDrainedQueues},u.prototype.fatalError=function(t,e){e?(r.stderr.write("Fatal "+(t instanceof Error?t.stack:t)+"\n"),r.exit(2)):this.throwLater(t)},u.prototype.throwLater=function(t,e){if(1===arguments.length&&(e=t,t=function(){throw e}),"undefined"!=typeof setTimeout)setTimeout(function(){t(e)},0);else try{this._schedule(function(){t(e)})}catch(t){throw new Error("No async scheduler available\n\n    See http://goo.gl/MqrFmX\n")}},a.hasDevTools?(u.prototype.invokeLater=function(t,e,r){this._trampolineEnabled?c.call(this,t,e,r):this._schedule(function(){setTimeout(function(){t.call(e,r)},100)})},u.prototype.invoke=function(t,e,r){this._trampolineEnabled?l.call(this,t,e,r):this._schedule(function(){t.call(e,r)})},u.prototype.settlePromises=function(t){this._trampolineEnabled?f.call(this,t):this._schedule(function(){t._settlePromises()})}):(u.prototype.invokeLater=c,u.prototype.invoke=l,u.prototype.settlePromises=f),u.prototype._drainQueue=function(t){for(;t.length()>0;){var e=t.shift();if("function"==typeof e){var r=t.shift(),n=t.shift();e.call(r,n)}else e._settlePromises()}},u.prototype._drainQueues=function(){this._drainQueue(this._normalQueue),this._reset(),this._haveDrainedQueues=!0,this._drainQueue(this._lateQueue)},u.prototype._queueTick=function(){this._isTickUsed||(this._isTickUsed=!0,this._schedule(this.drainQueues))},u.prototype._reset=function(){this._isTickUsed=!1},e.exports=u,e.exports.firstLineError=i},{"./queue":26,"./schedule":29,"./util":36}],3:[function(t,e,r){e.exports=function(t,e,r,n){var i=!1,o=function(t,e){this._reject(e)},s=function(t,e){e.promiseRejectionQueued=!0,e.bindingPromise._then(o,o,null,this,t)},a=function(t,e){0==(50397184&this._bitField)&&this._resolveCallback(e.target)},u=function(t,e){e.promiseRejectionQueued||this._reject(t)};t.prototype.bind=function(o){i||(i=!0,t.prototype._propagateFrom=n.propagateFromFunction(),t.prototype._boundValue=n.boundValueFunction());var c=r(o),l=new t(e);l._propagateFrom(this,1);var f=this._target();if(l._setBoundTo(c),c instanceof t){var h={promiseRejectionQueued:!1,promise:l,target:f,bindingPromise:c};f._then(e,s,void 0,l,h),c._then(a,u,void 0,l,h),l._setOnCancel(c)}else l._resolveCallback(f);return l},t.prototype._setBoundTo=function(t){void 0!==t?(this._bitField=2097152|this._bitField,this._boundTo=t):this._bitField=-2097153&this._bitField},t.prototype._isBound=function(){return 2097152==(2097152&this._bitField)},t.bind=function(e,r){return t.resolve(r).bind(e)}}},{}],4:[function(t,e,r){var n;"undefined"!=typeof Promise&&(n=Promise);var i=t("./promise")();i.noConflict=function(){try{Promise===i&&(Promise=n)}catch(t){}return i},e.exports=i},{"./promise":22}],5:[function(t,e,r){var n=Object.create;if(n){var i=n(null),o=n(null);i[" size"]=o[" size"]=0}e.exports=function(e){var r=t("./util"),n=r.canEvaluate;r.isIdentifier;function i(t){return function(t,n){var i;if(null!=t&&(i=t[n]),"function"!=typeof i){var o="Object "+r.classString(t)+" has no method '"+r.toString(n)+"'";throw new e.TypeError(o)}return i}(t,this.pop()).apply(t,this)}function o(t){return t[this]}function s(t){var e=+this;return e<0&&(e=Math.max(0,e+t.length)),t[e]}e.prototype.call=function(t){var e=[].slice.call(arguments,1);return e.push(t),this._then(i,void 0,void 0,e,void 0)},e.prototype.get=function(t){var e;if("number"==typeof t)e=s;else if(n){var r=(void 0)(t);e=null!==r?r:o}else e=o;return this._then(e,void 0,void 0,t,void 0)}}},{"./util":36}],6:[function(t,e,r){e.exports=function(e,r,n,i){var o=t("./util"),s=o.tryCatch,a=o.errorObj,u=e._async;e.prototype.break=e.prototype.cancel=function(){if(!i.cancellation())return this._warn("cancellation is disabled");for(var t=this,e=t;t._isCancellable();){if(!t._cancelBy(e)){e._isFollowing()?e._followee().cancel():e._cancelBranched();break}var r=t._cancellationParent;if(null==r||!r._isCancellable()){t._isFollowing()?t._followee().cancel():t._cancelBranched();break}t._isFollowing()&&t._followee().cancel(),t._setWillBeCancelled(),e=t,t=r}},e.prototype._branchHasCancelled=function(){this._branchesRemainingToCancel--},e.prototype._enoughBranchesHaveCancelled=function(){return void 0===this._branchesRemainingToCancel||this._branchesRemainingToCancel<=0},e.prototype._cancelBy=function(t){return t===this?(this._branchesRemainingToCancel=0,this._invokeOnCancel(),!0):(this._branchHasCancelled(),!!this._enoughBranchesHaveCancelled()&&(this._invokeOnCancel(),!0))},e.prototype._cancelBranched=function(){this._enoughBranchesHaveCancelled()&&this._cancel()},e.prototype._cancel=function(){this._isCancellable()&&(this._setCancelled(),u.invoke(this._cancelPromises,this,void 0))},e.prototype._cancelPromises=function(){this._length()>0&&this._settlePromises()},e.prototype._unsetOnCancel=function(){this._onCancelField=void 0},e.prototype._isCancellable=function(){return this.isPending()&&!this._isCancelled()},e.prototype.isCancellable=function(){return this.isPending()&&!this.isCancelled()},e.prototype._doInvokeOnCancel=function(t,e){if(o.isArray(t))for(var r=0;r<t.length;++r)this._doInvokeOnCancel(t[r],e);else if(void 0!==t)if("function"==typeof t){if(!e){var n=s(t).call(this._boundValue());n===a&&(this._attachExtraTrace(n.e),u.throwLater(n.e))}}else t._resultCancelled(this)},e.prototype._invokeOnCancel=function(){var t=this._onCancel();this._unsetOnCancel(),u.invoke(this._doInvokeOnCancel,this,t)},e.prototype._invokeInternalOnCancel=function(){this._isCancellable()&&(this._doInvokeOnCancel(this._onCancel(),!0),this._unsetOnCancel())},e.prototype._resultCancelled=function(){this.cancel()}}},{"./util":36}],7:[function(t,e,r){e.exports=function(e){var r=t("./util"),n=t("./es5").keys,i=r.tryCatch,o=r.errorObj;return function(t,s,a){return function(u){var c=a._boundValue();t:for(var l=0;l<t.length;++l){var f=t[l];if(f===Error||null!=f&&f.prototype instanceof Error){if(u instanceof f)return i(s).call(c,u)}else if("function"==typeof f){var h=i(f).call(c,u);if(h===o)return h;if(h)return i(s).call(c,u)}else if(r.isObject(u)){for(var p=n(f),y=0;y<p.length;++y){var d=p[y];if(f[d]!=u[d])continue t}return i(s).call(c,u)}}return e}}}},{"./es5":13,"./util":36}],8:[function(t,e,r){e.exports=function(t){var e=!1,r=[];function n(){this._trace=new n.CapturedTrace(i())}function i(){var t=r.length-1;if(t>=0)return r[t]}return t.prototype._promiseCreated=function(){},t.prototype._pushContext=function(){},t.prototype._popContext=function(){return null},t._peekContext=t.prototype._peekContext=function(){},n.prototype._pushContext=function(){void 0!==this._trace&&(this._trace._promiseCreated=null,r.push(this._trace))},n.prototype._popContext=function(){if(void 0!==this._trace){var t=r.pop(),e=t._promiseCreated;return t._promiseCreated=null,e}return null},n.CapturedTrace=null,n.create=function(){if(e)return new n},n.deactivateLongStackTraces=function(){},n.activateLongStackTraces=function(){var r=t.prototype._pushContext,o=t.prototype._popContext,s=t._peekContext,a=t.prototype._peekContext,u=t.prototype._promiseCreated;n.deactivateLongStackTraces=function(){t.prototype._pushContext=r,t.prototype._popContext=o,t._peekContext=s,t.prototype._peekContext=a,t.prototype._promiseCreated=u,e=!1},e=!0,t.prototype._pushContext=n.prototype._pushContext,t.prototype._popContext=n.prototype._popContext,t._peekContext=t.prototype._peekContext=i,t.prototype._promiseCreated=function(){var t=this._peekContext();t&&null==t._promiseCreated&&(t._promiseCreated=this)}},n}},{}],9:[function(t,e,n){e.exports=function(e,n){var i,o,s,a=e._getDomain,c=e._async,l=t("./errors").Warning,f=t("./util"),h=f.canAttachTrace,p=/[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/,y=/\((?:timers\.js):\d+:\d+\)/,d=/[\/<\(](.+?):(\d+):(\d+)\)?\s*$/,v=null,_=null,m=!1,g=!(0==f.env("BLUEBIRD_DEBUG")),b=!(0==f.env("BLUEBIRD_WARNINGS")||!g&&!f.env("BLUEBIRD_WARNINGS")),w=!(0==f.env("BLUEBIRD_LONG_STACK_TRACES")||!g&&!f.env("BLUEBIRD_LONG_STACK_TRACES")),O=0!=f.env("BLUEBIRD_W_FORGOTTEN_RETURN")&&(b||!!f.env("BLUEBIRD_W_FORGOTTEN_RETURN"));e.prototype.suppressUnhandledRejections=function(){var t=this._target();t._bitField=-1048577&t._bitField|524288},e.prototype._ensurePossibleRejectionHandled=function(){if(0==(524288&this._bitField)){this._setRejectionIsUnhandled();var t=this;setTimeout(function(){t._notifyUnhandledRejection()},1)}},e.prototype._notifyUnhandledRejectionIsHandled=function(){W("rejectionHandled",i,void 0,this)},e.prototype._setReturnedNonUndefined=function(){this._bitField=268435456|this._bitField},e.prototype._returnedNonUndefined=function(){return 0!=(268435456&this._bitField)},e.prototype._notifyUnhandledRejection=function(){if(this._isRejectionUnhandled()){var t=this._settledValue();this._setUnhandledRejectionIsNotified(),W("unhandledRejection",o,t,this)}},e.prototype._setUnhandledRejectionIsNotified=function(){this._bitField=262144|this._bitField},e.prototype._unsetUnhandledRejectionIsNotified=function(){this._bitField=-262145&this._bitField},e.prototype._isUnhandledRejectionNotified=function(){return(262144&this._bitField)>0},e.prototype._setRejectionIsUnhandled=function(){this._bitField=1048576|this._bitField},e.prototype._unsetRejectionIsUnhandled=function(){this._bitField=-1048577&this._bitField,this._isUnhandledRejectionNotified()&&(this._unsetUnhandledRejectionIsNotified(),this._notifyUnhandledRejectionIsHandled())},e.prototype._isRejectionUnhandled=function(){return(1048576&this._bitField)>0},e.prototype._warn=function(t,e,r){return L(t,e,r||this)},e.onPossiblyUnhandledRejection=function(t){var e=a();o="function"==typeof t?null===e?t:f.domainBind(e,t):void 0},e.onUnhandledRejectionHandled=function(t){var e=a();i="function"==typeof t?null===e?t:f.domainBind(e,t):void 0};var S=function(){};e.longStackTraces=function(){if(c.haveItemsQueued()&&!X.longStackTraces)throw new Error("cannot enable long stack traces after promises have been created\n\n    See http://goo.gl/MqrFmX\n");if(!X.longStackTraces&&Y()){var t=e.prototype._captureStackTrace,r=e.prototype._attachExtraTrace;X.longStackTraces=!0,S=function(){if(c.haveItemsQueued()&&!X.longStackTraces)throw new Error("cannot enable long stack traces after promises have been created\n\n    See http://goo.gl/MqrFmX\n");e.prototype._captureStackTrace=t,e.prototype._attachExtraTrace=r,n.deactivateLongStackTraces(),c.enableTrampoline(),X.longStackTraces=!1},e.prototype._captureStackTrace=F,e.prototype._attachExtraTrace=I,n.activateLongStackTraces(),c.disableTrampolineIfNecessary()}},e.hasLongStackTraces=function(){return X.longStackTraces&&Y()};var E=function(){try{if("function"==typeof CustomEvent){var t=new CustomEvent("CustomEvent");return f.global.dispatchEvent(t),function(t,e){var r=new CustomEvent(t.toLowerCase(),{detail:e,cancelable:!0});return!f.global.dispatchEvent(r)}}if("function"==typeof Event){t=new Event("CustomEvent");return f.global.dispatchEvent(t),function(t,e){var r=new Event(t.toLowerCase(),{cancelable:!0});return r.detail=e,!f.global.dispatchEvent(r)}}return(t=document.createEvent("CustomEvent")).initCustomEvent("testingtheevent",!1,!0,{}),f.global.dispatchEvent(t),function(t,e){var r=document.createEvent("CustomEvent");return r.initCustomEvent(t.toLowerCase(),!1,!0,e),!f.global.dispatchEvent(r)}}catch(t){}return function(){return!1}}(),A=f.isNode?function(){return r.emit.apply(r,arguments)}:f.global?function(t){var e="on"+t.toLowerCase(),r=f.global[e];return!!r&&(r.apply(f.global,[].slice.call(arguments,1)),!0)}:function(){return!1};function j(t,e){return{promise:e}}var $={promiseCreated:j,promiseFulfilled:j,promiseRejected:j,promiseResolved:j,promiseCancelled:j,promiseChained:function(t,e,r){return{promise:e,child:r}},warning:function(t,e){return{warning:e}},unhandledRejection:function(t,e,r){return{reason:e,promise:r}},rejectionHandled:j},x=function(t){var e=!1;try{e=A.apply(null,arguments)}catch(t){c.throwLater(t),e=!0}var r=!1;try{r=E(t,$[t].apply(null,arguments))}catch(t){c.throwLater(t),r=!0}return r||e};function P(){return!1}function N(t,e,r){var n=this;try{t(e,r,function(t){if("function"!=typeof t)throw new TypeError("onCancel must be a function, got: "+f.toString(t));n._attachCancellationCallback(t)})}catch(t){return t}}function T(t){if(!this._isCancellable())return this;var e=this._onCancel();void 0!==e?f.isArray(e)?e.push(t):this._setOnCancel([e,t]):this._setOnCancel(t)}function k(){return this._onCancelField}function B(t){this._onCancelField=t}function C(){this._cancellationParent=void 0,this._onCancelField=void 0}function D(t,e){if(0!=(1&e)){this._cancellationParent=t;var r=t._branchesRemainingToCancel;void 0===r&&(r=0),t._branchesRemainingToCancel=r+1}0!=(2&e)&&t._isBound()&&this._setBoundTo(t._boundTo)}e.config=function(t){if("longStackTraces"in(t=Object(t))&&(t.longStackTraces?e.longStackTraces():!t.longStackTraces&&e.hasLongStackTraces()&&S()),"warnings"in t){var r=t.warnings;X.warnings=!!r,O=X.warnings,f.isObject(r)&&"wForgottenReturn"in r&&(O=!!r.wForgottenReturn)}if("cancellation"in t&&t.cancellation&&!X.cancellation){if(c.haveItemsQueued())throw new Error("cannot enable cancellation after promises are in use");e.prototype._clearCancellationData=C,e.prototype._propagateFrom=D,e.prototype._onCancel=k,e.prototype._setOnCancel=B,e.prototype._attachCancellationCallback=T,e.prototype._execute=N,M=D,X.cancellation=!0}return"monitoring"in t&&(t.monitoring&&!X.monitoring?(X.monitoring=!0,e.prototype._fireEvent=x):!t.monitoring&&X.monitoring&&(X.monitoring=!1,e.prototype._fireEvent=P)),e},e.prototype._fireEvent=P,e.prototype._execute=function(t,e,r){try{t(e,r)}catch(t){return t}},e.prototype._onCancel=function(){},e.prototype._setOnCancel=function(t){},e.prototype._attachCancellationCallback=function(t){},e.prototype._captureStackTrace=function(){},e.prototype._attachExtraTrace=function(){},e.prototype._clearCancellationData=function(){},e.prototype._propagateFrom=function(t,e){};var M=function(t,e){0!=(2&e)&&t._isBound()&&this._setBoundTo(t._boundTo)};function R(){var t=this._boundTo;return void 0!==t&&t instanceof e?t.isFulfilled()?t.value():void 0:t}function F(){this._trace=new J(this._peekContext())}function I(t,e){if(h(t)){var r=this._trace;if(void 0!==r&&e&&(r=r._parent),void 0!==r)r.attachExtraTrace(t);else if(!t.__stackCleaned__){var n=V(t);f.notEnumerableProp(t,"stack",n.message+"\n"+n.stack.join("\n")),f.notEnumerableProp(t,"__stackCleaned__",!0)}}}function L(t,r,n){if(X.warnings){var i,o=new l(t);if(r)n._attachExtraTrace(o);else if(X.longStackTraces&&(i=e._peekContext()))i.attachExtraTrace(o);else{var s=V(o);o.stack=s.message+"\n"+s.stack.join("\n")}x("warning",o)||q(o,"",!0)}}function U(t){for(var e=[],r=0;r<t.length;++r){var n=t[r],i="    (No stack trace)"===n||v.test(n),o=i&&z(n);i&&!o&&(m&&" "!==n.charAt(0)&&(n="    "+n),e.push(n))}return e}function V(t){var e=t.stack,r=t.toString();return e="string"==typeof e&&e.length>0?function(t){for(var e=t.stack.replace(/\s+$/g,"").split("\n"),r=0;r<e.length;++r){var n=e[r];if("    (No stack trace)"===n||v.test(n))break}return r>0&&"SyntaxError"!=t.name&&(e=e.slice(r)),e}(t):["    (No stack trace)"],{message:r,stack:"SyntaxError"==t.name?e:U(e)}}function q(t,e,r){if("undefined"!=typeof console){var n;if(f.isObject(t)){var i=t.stack;n=e+_(i,t)}else n=e+String(t);"function"==typeof s?s(n,r):"function"!=typeof console.log&&"object"!==u(console.log)||console.log(n)}}function W(t,e,r,n){var i=!1;try{"function"==typeof e&&(i=!0,"rejectionHandled"===t?e(n):e(r,n))}catch(t){c.throwLater(t)}"unhandledRejection"===t?x(t,r,n)||i||q(r,"Unhandled rejection "):x(t,n)}function H(t){var e;if("function"==typeof t)e="[function "+(t.name||"anonymous")+"]";else{e=t&&"function"==typeof t.toString?t.toString():f.toString(t);if(/\[object [a-zA-Z0-9$_]+\]/.test(e))try{e=JSON.stringify(t)}catch(t){}0===e.length&&(e="(empty array)")}return"(<"+function(t){if(t.length<41)return t;return t.substr(0,38)+"..."}(e)+">, no stack trace)"}function Y(){return"function"==typeof G}var z=function(){return!1},K=/[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;function Q(t){var e=t.match(K);if(e)return{fileName:e[1],line:parseInt(e[2],10)}}function J(t){this._parent=t,this._promisesCreated=0;var e=this._length=1+(void 0===t?0:t._length);G(this,J),e>32&&this.uncycle()}f.inherits(J,Error),n.CapturedTrace=J,J.prototype.uncycle=function(){var t=this._length;if(!(t<2)){for(var e=[],r={},n=0,i=this;void 0!==i;++n)e.push(i),i=i._parent;for(n=(t=this._length=n)-1;n>=0;--n){var o=e[n].stack;void 0===r[o]&&(r[o]=n)}for(n=0;n<t;++n){var s=r[e[n].stack];if(void 0!==s&&s!==n){s>0&&(e[s-1]._parent=void 0,e[s-1]._length=1),e[n]._parent=void 0,e[n]._length=1;var a=n>0?e[n-1]:this;s<t-1?(a._parent=e[s+1],a._parent.uncycle(),a._length=a._parent._length+1):(a._parent=void 0,a._length=1);for(var u=a._length+1,c=n-2;c>=0;--c)e[c]._length=u,u++;return}}}},J.prototype.attachExtraTrace=function(t){if(!t.__stackCleaned__){this.uncycle();for(var e=V(t),r=e.message,n=[e.stack],i=this;void 0!==i;)n.push(U(i.stack.split("\n"))),i=i._parent;!function(t){for(var e=t[0],r=1;r<t.length;++r){for(var n=t[r],i=e.length-1,o=e[i],s=-1,a=n.length-1;a>=0;--a)if(n[a]===o){s=a;break}for(a=s;a>=0;--a){var u=n[a];if(e[i]!==u)break;e.pop(),i--}e=n}}(n),function(t){for(var e=0;e<t.length;++e)(0===t[e].length||e+1<t.length&&t[e][0]===t[e+1][0])&&(t.splice(e,1),e--)}(n),f.notEnumerableProp(t,"stack",function(t,e){for(var r=0;r<e.length-1;++r)e[r].push("From previous event:"),e[r]=e[r].join("\n");return r<e.length&&(e[r]=e[r].join("\n")),t+"\n"+e.join("\n")}(r,n)),f.notEnumerableProp(t,"__stackCleaned__",!0)}};var G=function(){var t=/^\s*at\s*/,e=function(t,e){return"string"==typeof t?t:void 0!==e.name&&void 0!==e.message?e.toString():H(e)};if("number"==typeof Error.stackTraceLimit&&"function"==typeof Error.captureStackTrace){Error.stackTraceLimit+=6,v=t,_=e;var r=Error.captureStackTrace;return z=function(t){return p.test(t)},function(t,e){Error.stackTraceLimit+=6,r(t,e),Error.stackTraceLimit-=6}}var n,i=new Error;if("string"==typeof i.stack&&i.stack.split("\n")[0].indexOf("stackDetection@")>=0)return v=/@/,_=e,m=!0,function(t){t.stack=(new Error).stack};try{throw new Error}catch(t){n="stack"in t}return"stack"in i||!n||"number"!=typeof Error.stackTraceLimit?(_=function(t,e){return"string"==typeof t?t:"object"!==(void 0===e?"undefined":u(e))&&"function"!=typeof e||void 0===e.name||void 0===e.message?H(e):e.toString()},null):(v=t,_=e,function(t){Error.stackTraceLimit+=6;try{throw new Error}catch(e){t.stack=e.stack}Error.stackTraceLimit-=6})}();"undefined"!=typeof console&&void 0!==console.warn&&(s=function(t){console.warn(t)},f.isNode&&r.stderr.isTTY?s=function(t,e){var r=e?"[33m":"[31m";console.warn(r+t+"[0m\n")}:f.isNode||"string"!=typeof(new Error).stack||(s=function(t,e){console.warn("%c"+t,e?"color: darkorange":"color: red")}));var X={warnings:b,longStackTraces:!1,cancellation:!1,monitoring:!1};return w&&e.longStackTraces(),{longStackTraces:function(){return X.longStackTraces},warnings:function(){return X.warnings},cancellation:function(){return X.cancellation},monitoring:function(){return X.monitoring},propagateFromFunction:function(){return M},boundValueFunction:function(){return R},checkForgottenReturns:function(t,e,r,n,i){if(void 0===t&&null!==e&&O){if(void 0!==i&&i._returnedNonUndefined())return;if(0==(65535&n._bitField))return;r&&(r+=" ");var o="",s="";if(e._trace){for(var a=e._trace.stack.split("\n"),u=U(a),c=u.length-1;c>=0;--c){var l=u[c];if(!y.test(l)){var f=l.match(d);f&&(o="at "+f[1]+":"+f[2]+":"+f[3]+" ");break}}if(u.length>0){var h=u[0];for(c=0;c<a.length;++c)if(a[c]===h){c>0&&(s="\n"+a[c-1]);break}}}var p="a promise was created in a "+r+"handler "+o+"but was not returned from it, see http://goo.gl/rRqMUw"+s;n._warn(p,!0,e)}},setBounds:function(t,e){if(Y()){for(var r,n,i=t.stack.split("\n"),o=e.stack.split("\n"),s=-1,a=-1,u=0;u<i.length;++u)if(c=Q(i[u])){r=c.fileName,s=c.line;break}for(u=0;u<o.length;++u){var c;if(c=Q(o[u])){n=c.fileName,a=c.line;break}}s<0||a<0||!r||!n||r!==n||s>=a||(z=function(t){if(p.test(t))return!0;var e=Q(t);return!!(e&&e.fileName===r&&s<=e.line&&e.line<=a)})}},warn:L,deprecated:function(t,e){var r=t+" is deprecated and will be removed in a future version.";return e&&(r+=" Use "+e+" instead."),L(r)},CapturedTrace:J,fireDomEvent:E,fireGlobalEvent:A}}},{"./errors":12,"./util":36}],10:[function(t,e,r){e.exports=function(t){function e(){return this.value}function r(){throw this.reason}t.prototype.return=t.prototype.thenReturn=function(r){return r instanceof t&&r.suppressUnhandledRejections(),this._then(e,void 0,void 0,{value:r},void 0)},t.prototype.throw=t.prototype.thenThrow=function(t){return this._then(r,void 0,void 0,{reason:t},void 0)},t.prototype.catchThrow=function(t){if(arguments.length<=1)return this._then(void 0,r,void 0,{reason:t},void 0);var e=arguments[1];return this.caught(t,function(){throw e})},t.prototype.catchReturn=function(r){if(arguments.length<=1)return r instanceof t&&r.suppressUnhandledRejections(),this._then(void 0,e,void 0,{value:r},void 0);var n=arguments[1];n instanceof t&&n.suppressUnhandledRejections();return this.caught(r,function(){return n})}}},{}],11:[function(t,e,r){e.exports=function(t,e){var r=t.reduce,n=t.all;function i(){return n(this)}t.prototype.each=function(t){return r(this,t,e,0)._then(i,void 0,void 0,this,void 0)},t.prototype.mapSeries=function(t){return r(this,t,e,e)},t.each=function(t,n){return r(t,n,e,0)._then(i,void 0,void 0,t,void 0)},t.mapSeries=function(t,n){return r(t,n,e,e)}}},{}],12:[function(t,e,r){var n,i,o=t("./es5"),s=o.freeze,a=t("./util"),u=a.inherits,c=a.notEnumerableProp;function l(t,e){function r(n){if(!(this instanceof r))return new r(n);c(this,"message","string"==typeof n?n:e),c(this,"name",t),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):Error.call(this)}return u(r,Error),r}var f=l("Warning","warning"),h=l("CancellationError","cancellation error"),p=l("TimeoutError","timeout error"),y=l("AggregateError","aggregate error");try{n=TypeError,i=RangeError}catch(t){n=l("TypeError","type error"),i=l("RangeError","range error")}for(var d="join pop push shift unshift slice filter forEach some every map indexOf lastIndexOf reduce reduceRight sort reverse".split(" "),v=0;v<d.length;++v)"function"==typeof Array.prototype[d[v]]&&(y.prototype[d[v]]=Array.prototype[d[v]]);o.defineProperty(y.prototype,"length",{value:0,configurable:!1,writable:!0,enumerable:!0}),y.prototype.isOperational=!0;var _=0;function m(t){if(!(this instanceof m))return new m(t);c(this,"name","OperationalError"),c(this,"message",t),this.cause=t,this.isOperational=!0,t instanceof Error?(c(this,"message",t.message),c(this,"stack",t.stack)):Error.captureStackTrace&&Error.captureStackTrace(this,this.constructor)}y.prototype.toString=function(){var t=Array(4*_+1).join(" "),e="\n"+t+"AggregateError of:\n";_++,t=Array(4*_+1).join(" ");for(var r=0;r<this.length;++r){for(var n=this[r]===this?"[Circular AggregateError]":this[r]+"",i=n.split("\n"),o=0;o<i.length;++o)i[o]=t+i[o];e+=(n=i.join("\n"))+"\n"}return _--,e},u(m,Error);var g=Error.__BluebirdErrorTypes__;g||(g=s({CancellationError:h,TimeoutError:p,OperationalError:m,RejectionError:m,AggregateError:y}),o.defineProperty(Error,"__BluebirdErrorTypes__",{value:g,writable:!1,enumerable:!1,configurable:!1})),e.exports={Error:Error,TypeError:n,RangeError:i,CancellationError:g.CancellationError,OperationalError:g.OperationalError,TimeoutError:g.TimeoutError,AggregateError:g.AggregateError,Warning:f}},{"./es5":13,"./util":36}],13:[function(t,e,r){var n=function(){return void 0===this}();if(n)e.exports={freeze:Object.freeze,defineProperty:Object.defineProperty,getDescriptor:Object.getOwnPropertyDescriptor,keys:Object.keys,names:Object.getOwnPropertyNames,getPrototypeOf:Object.getPrototypeOf,isArray:Array.isArray,isES5:n,propertyIsWritable:function(t,e){var r=Object.getOwnPropertyDescriptor(t,e);return!(r&&!r.writable&&!r.set)}};else{var i={}.hasOwnProperty,o={}.toString,s={}.constructor.prototype,a=function(t){var e=[];for(var r in t)i.call(t,r)&&e.push(r);return e};e.exports={isArray:function(t){try{return"[object Array]"===o.call(t)}catch(t){return!1}},keys:a,names:a,defineProperty:function(t,e,r){return t[e]=r.value,t},getDescriptor:function(t,e){return{value:t[e]}},freeze:function(t){return t},getPrototypeOf:function(t){try{return Object(t).constructor.prototype}catch(t){return s}},isES5:n,propertyIsWritable:function(){return!0}}}},{}],14:[function(t,e,r){e.exports=function(t,e){var r=t.map;t.prototype.filter=function(t,n){return r(this,t,n,e)},t.filter=function(t,n,i){return r(t,n,i,e)}}},{}],15:[function(t,e,r){e.exports=function(e,r,n){var i=t("./util"),o=e.CancellationError,s=i.errorObj,a=t("./catch_filter")(n);function u(t,e,r){this.promise=t,this.type=e,this.handler=r,this.called=!1,this.cancelPromise=null}function c(t){this.finallyHandler=t}function l(t,e){return null!=t.cancelPromise&&(arguments.length>1?t.cancelPromise._reject(e):t.cancelPromise._cancel(),t.cancelPromise=null,!0)}function f(){return p.call(this,this.promise._target()._settledValue())}function h(t){if(!l(this,t))return s.e=t,s}function p(t){var i=this.promise,a=this.handler;if(!this.called){this.called=!0;var u=this.isFinallyHandler()?a.call(i._boundValue()):a.call(i._boundValue(),t);if(u===n)return u;if(void 0!==u){i._setReturnedNonUndefined();var p=r(u,i);if(p instanceof e){if(null!=this.cancelPromise){if(p._isCancelled()){var y=new o("late cancellation observer");return i._attachExtraTrace(y),s.e=y,s}p.isPending()&&p._attachCancellationCallback(new c(this))}return p._then(f,h,void 0,this,void 0)}}}return i.isRejected()?(l(this),s.e=t,s):(l(this),t)}return u.prototype.isFinallyHandler=function(){return 0===this.type},c.prototype._resultCancelled=function(){l(this.finallyHandler)},e.prototype._passThrough=function(t,e,r,n){return"function"!=typeof t?this.then():this._then(r,n,void 0,new u(this,e,t),void 0)},e.prototype.lastly=e.prototype.finally=function(t){return this._passThrough(t,0,p,p)},e.prototype.tap=function(t){return this._passThrough(t,1,p)},e.prototype.tapCatch=function(t){var r=arguments.length;if(1===r)return this._passThrough(t,1,void 0,p);var n,o=new Array(r-1),s=0;for(n=0;n<r-1;++n){var u=arguments[n];if(!i.isObject(u))return e.reject(new TypeError("tapCatch statement predicate: expecting an object but got "+i.classString(u)));o[s++]=u}o.length=s;var c=arguments[n];return this._passThrough(a(o,c,this),1,void 0,p)},u}},{"./catch_filter":7,"./util":36}],16:[function(t,e,r){e.exports=function(e,r,n,i,o,s){var a=t("./errors").TypeError,u=t("./util"),c=u.errorObj,l=u.tryCatch,f=[];function h(t,r,i,o){if(s.cancellation()){var a=new e(n),u=this._finallyPromise=new e(n);this._promise=a.lastly(function(){return u}),a._captureStackTrace(),a._setOnCancel(this)}else{(this._promise=new e(n))._captureStackTrace()}this._stack=o,this._generatorFunction=t,this._receiver=r,this._generator=void 0,this._yieldHandlers="function"==typeof i?[i].concat(f):f,this._yieldedPromise=null,this._cancellationPhase=!1}u.inherits(h,o),h.prototype._isResolved=function(){return null===this._promise},h.prototype._cleanup=function(){this._promise=this._generator=null,s.cancellation()&&null!==this._finallyPromise&&(this._finallyPromise._fulfill(),this._finallyPromise=null)},h.prototype._promiseCancelled=function(){if(!this._isResolved()){var t;if(void 0!==this._generator.return)this._promise._pushContext(),t=l(this._generator.return).call(this._generator,void 0),this._promise._popContext();else{var r=new e.CancellationError("generator .return() sentinel");e.coroutine.returnSentinel=r,this._promise._attachExtraTrace(r),this._promise._pushContext(),t=l(this._generator.throw).call(this._generator,r),this._promise._popContext()}this._cancellationPhase=!0,this._yieldedPromise=null,this._continue(t)}},h.prototype._promiseFulfilled=function(t){this._yieldedPromise=null,this._promise._pushContext();var e=l(this._generator.next).call(this._generator,t);this._promise._popContext(),this._continue(e)},h.prototype._promiseRejected=function(t){this._yieldedPromise=null,this._promise._attachExtraTrace(t),this._promise._pushContext();var e=l(this._generator.throw).call(this._generator,t);this._promise._popContext(),this._continue(e)},h.prototype._resultCancelled=function(){if(this._yieldedPromise instanceof e){var t=this._yieldedPromise;this._yieldedPromise=null,t.cancel()}},h.prototype.promise=function(){return this._promise},h.prototype._run=function(){this._generator=this._generatorFunction.call(this._receiver),this._receiver=this._generatorFunction=void 0,this._promiseFulfilled(void 0)},h.prototype._continue=function(t){var r=this._promise;if(t===c)return this._cleanup(),this._cancellationPhase?r.cancel():r._rejectCallback(t.e,!1);var n=t.value;if(!0===t.done)return this._cleanup(),this._cancellationPhase?r.cancel():r._resolveCallback(n);var o=i(n,this._promise);if(o instanceof e||null!==(o=function(t,r,n){for(var o=0;o<r.length;++o){n._pushContext();var s=l(r[o])(t);if(n._popContext(),s===c){n._pushContext();var a=e.reject(c.e);return n._popContext(),a}var u=i(s,n);if(u instanceof e)return u}return null}(o,this._yieldHandlers,this._promise))){var s=(o=o._target())._bitField;0==(50397184&s)?(this._yieldedPromise=o,o._proxy(this,null)):0!=(33554432&s)?e._async.invoke(this._promiseFulfilled,this,o._value()):0!=(16777216&s)?e._async.invoke(this._promiseRejected,this,o._reason()):this._promiseCancelled()}else this._promiseRejected(new a("A value %s was yielded that could not be treated as a promise\n\n    See http://goo.gl/MqrFmX\n\n".replace("%s",String(n))+"From coroutine:\n"+this._stack.split("\n").slice(1,-7).join("\n")))},e.coroutine=function(t,e){if("function"!=typeof t)throw new a("generatorFunction must be a function\n\n    See http://goo.gl/MqrFmX\n");var r=Object(e).yieldHandler,n=h,i=(new Error).stack;return function(){var e=t.apply(this,arguments),o=new n(void 0,void 0,r,i),s=o.promise();return o._generator=e,o._promiseFulfilled(void 0),s}},e.coroutine.addYieldHandler=function(t){if("function"!=typeof t)throw new a("expecting a function but got "+u.classString(t));f.push(t)},e.spawn=function(t){if(s.deprecated("Promise.spawn()","Promise.coroutine()"),"function"!=typeof t)return r("generatorFunction must be a function\n\n    See http://goo.gl/MqrFmX\n");var n=new h(t,this),i=n.promise();return n._run(e.spawn),i}}},{"./errors":12,"./util":36}],17:[function(t,e,r){e.exports=function(e,r,n,i,o,s){var a=t("./util");a.canEvaluate,a.tryCatch,a.errorObj;e.join=function(){var t,e=arguments.length-1;e>0&&"function"==typeof arguments[e]&&(t=arguments[e]);var n=[].slice.call(arguments);t&&n.pop();var i=new r(n).promise();return void 0!==t?i.spread(t):i}}},{"./util":36}],18:[function(t,e,r){e.exports=function(e,r,n,i,o,s){var a=e._getDomain,c=t("./util"),l=c.tryCatch,f=c.errorObj,h=e._async;function p(t,e,r,n){this.constructor$(t),this._promise._captureStackTrace();var i=a();this._callback=null===i?e:c.domainBind(i,e),this._preservedValues=n===o?new Array(this.length()):null,this._limit=r,this._inFlight=0,this._queue=[],h.invoke(this._asyncInit,this,void 0)}function y(t,r,i,o){if("function"!=typeof r)return n("expecting a function but got "+c.classString(r));var s=0;if(void 0!==i){if("object"!==(void 0===i?"undefined":u(i))||null===i)return e.reject(new TypeError("options argument must be an object but it is "+c.classString(i)));if("number"!=typeof i.concurrency)return e.reject(new TypeError("'concurrency' must be a number but it is "+c.classString(i.concurrency)));s=i.concurrency}return new p(t,r,s="number"==typeof s&&isFinite(s)&&s>=1?s:0,o).promise()}c.inherits(p,r),p.prototype._asyncInit=function(){this._init$(void 0,-2)},p.prototype._init=function(){},p.prototype._promiseFulfilled=function(t,r){var n=this._values,o=this.length(),a=this._preservedValues,u=this._limit;if(r<0){if(n[r=-1*r-1]=t,u>=1&&(this._inFlight--,this._drainQueue(),this._isResolved()))return!0}else{if(u>=1&&this._inFlight>=u)return n[r]=t,this._queue.push(r),!1;null!==a&&(a[r]=t);var c=this._promise,h=this._callback,p=c._boundValue();c._pushContext();var y=l(h).call(p,t,r,o),d=c._popContext();if(s.checkForgottenReturns(y,d,null!==a?"Promise.filter":"Promise.map",c),y===f)return this._reject(y.e),!0;var v=i(y,this._promise);if(v instanceof e){var _=(v=v._target())._bitField;if(0==(50397184&_))return u>=1&&this._inFlight++,n[r]=v,v._proxy(this,-1*(r+1)),!1;if(0==(33554432&_))return 0!=(16777216&_)?(this._reject(v._reason()),!0):(this._cancel(),!0);y=v._value()}n[r]=y}return++this._totalResolved>=o&&(null!==a?this._filter(n,a):this._resolve(n),!0)},p.prototype._drainQueue=function(){for(var t=this._queue,e=this._limit,r=this._values;t.length>0&&this._inFlight<e;){if(this._isResolved())return;var n=t.pop();this._promiseFulfilled(r[n],n)}},p.prototype._filter=function(t,e){for(var r=e.length,n=new Array(r),i=0,o=0;o<r;++o)t[o]&&(n[i++]=e[o]);n.length=i,this._resolve(n)},p.prototype.preservedValues=function(){return this._preservedValues},e.prototype.map=function(t,e){return y(this,t,e,null)},e.map=function(t,e,r,n){return y(t,e,r,n)}}},{"./util":36}],19:[function(t,e,r){e.exports=function(e,r,n,i,o){var s=t("./util"),a=s.tryCatch;e.method=function(t){if("function"!=typeof t)throw new e.TypeError("expecting a function but got "+s.classString(t));return function(){var n=new e(r);n._captureStackTrace(),n._pushContext();var i=a(t).apply(this,arguments),s=n._popContext();return o.checkForgottenReturns(i,s,"Promise.method",n),n._resolveFromSyncValue(i),n}},e.attempt=e.try=function(t){if("function"!=typeof t)return i("expecting a function but got "+s.classString(t));var n,u=new e(r);if(u._captureStackTrace(),u._pushContext(),arguments.length>1){o.deprecated("calling Promise.try with more than 1 argument");var c=arguments[1],l=arguments[2];n=s.isArray(c)?a(t).apply(l,c):a(t).call(l,c)}else n=a(t)();var f=u._popContext();return o.checkForgottenReturns(n,f,"Promise.try",u),u._resolveFromSyncValue(n),u},e.prototype._resolveFromSyncValue=function(t){t===s.errorObj?this._rejectCallback(t.e,!1):this._resolveCallback(t,!0)}}},{"./util":36}],20:[function(t,e,r){var n=t("./util"),i=n.maybeWrapAsError,o=t("./errors").OperationalError,s=t("./es5");var a=/^(?:name|message|stack|cause)$/;function u(t){var e;if(function(t){return t instanceof Error&&s.getPrototypeOf(t)===Error.prototype}(t)){(e=new o(t)).name=t.name,e.message=t.message,e.stack=t.stack;for(var r=s.keys(t),i=0;i<r.length;++i){var u=r[i];a.test(u)||(e[u]=t[u])}return e}return n.markAsOriginatingFromRejection(t),t}e.exports=function(t,e){return function(r,n){if(null!==t){if(r){var o=u(i(r));t._attachExtraTrace(o),t._reject(o)}else if(e){var s=[].slice.call(arguments,1);t._fulfill(s)}else t._fulfill(n);t=null}}}},{"./errors":12,"./es5":13,"./util":36}],21:[function(t,e,r){e.exports=function(e){var r=t("./util"),n=e._async,i=r.tryCatch,o=r.errorObj;function s(t,e){if(!r.isArray(t))return a.call(this,t,e);var s=i(e).apply(this._boundValue(),[null].concat(t));s===o&&n.throwLater(s.e)}function a(t,e){var r=this._boundValue(),s=void 0===t?i(e).call(r,null):i(e).call(r,null,t);s===o&&n.throwLater(s.e)}function u(t,e){if(!t){var r=new Error(t+"");r.cause=t,t=r}var s=i(e).call(this._boundValue(),t);s===o&&n.throwLater(s.e)}e.prototype.asCallback=e.prototype.nodeify=function(t,e){if("function"==typeof t){var r=a;void 0!==e&&Object(e).spread&&(r=s),this._then(r,u,void 0,this,t)}return this}}},{"./util":36}],22:[function(t,e,n){e.exports=function(){var n=function(){return new y("circular promise resolution chain\n\n    See http://goo.gl/MqrFmX\n")},i=function(){return new P.PromiseInspection(this._target())},o=function(t){return P.reject(new y(t))};function s(){}var a,u={},c=t("./util");a=c.isNode?function(){var t=r.domain;return void 0===t&&(t=null),t}:function(){return null},c.notEnumerableProp(P,"_getDomain",a);var l=t("./es5"),f=t("./async"),h=new f;l.defineProperty(P,"_async",{value:h});var p=t("./errors"),y=P.TypeError=p.TypeError;P.RangeError=p.RangeError;var d=P.CancellationError=p.CancellationError;P.TimeoutError=p.TimeoutError,P.OperationalError=p.OperationalError,P.RejectionError=p.OperationalError,P.AggregateError=p.AggregateError;var v=function(){},_={},m={},g=t("./thenables")(P,v),b=t("./promise_array")(P,v,g,o,s),w=t("./context")(P),O=w.create,S=t("./debuggability")(P,w),E=(S.CapturedTrace,t("./finally")(P,g,m)),A=t("./catch_filter")(m),j=t("./nodeback"),$=c.errorObj,x=c.tryCatch;function P(t){t!==v&&function(t,e){if(null==t||t.constructor!==P)throw new y("the promise constructor cannot be invoked directly\n\n    See http://goo.gl/MqrFmX\n");if("function"!=typeof e)throw new y("expecting a function but got "+c.classString(e))}(this,t),this._bitField=0,this._fulfillmentHandler0=void 0,this._rejectionHandler0=void 0,this._promise0=void 0,this._receiver0=void 0,this._resolveFromExecutor(t),this._promiseCreated(),this._fireEvent("promiseCreated",this)}function N(t){this.promise._resolveCallback(t)}function T(t){this.promise._rejectCallback(t,!1)}function k(t){var e=new P(v);e._fulfillmentHandler0=t,e._rejectionHandler0=t,e._promise0=t,e._receiver0=t}return P.prototype.toString=function(){return"[object Promise]"},P.prototype.caught=P.prototype.catch=function(t){var e=arguments.length;if(e>1){var r,n=new Array(e-1),i=0;for(r=0;r<e-1;++r){var s=arguments[r];if(!c.isObject(s))return o("Catch statement predicate: expecting an object but got "+c.classString(s));n[i++]=s}return n.length=i,t=arguments[r],this.then(void 0,A(n,t,this))}return this.then(void 0,t)},P.prototype.reflect=function(){return this._then(i,i,void 0,this,void 0)},P.prototype.then=function(t,e){if(S.warnings()&&arguments.length>0&&"function"!=typeof t&&"function"!=typeof e){var r=".then() only accepts functions but was passed: "+c.classString(t);arguments.length>1&&(r+=", "+c.classString(e)),this._warn(r)}return this._then(t,e,void 0,void 0,void 0)},P.prototype.done=function(t,e){this._then(t,e,void 0,void 0,void 0)._setIsFinal()},P.prototype.spread=function(t){return"function"!=typeof t?o("expecting a function but got "+c.classString(t)):this.all()._then(t,void 0,void 0,_,void 0)},P.prototype.toJSON=function(){var t={isFulfilled:!1,isRejected:!1,fulfillmentValue:void 0,rejectionReason:void 0};return this.isFulfilled()?(t.fulfillmentValue=this.value(),t.isFulfilled=!0):this.isRejected()&&(t.rejectionReason=this.reason(),t.isRejected=!0),t},P.prototype.all=function(){return arguments.length>0&&this._warn(".all() was passed arguments but it does not take any"),new b(this).promise()},P.prototype.error=function(t){return this.caught(c.originatesFromRejection,t)},P.getNewLibraryCopy=e.exports,P.is=function(t){return t instanceof P},P.fromNode=P.fromCallback=function(t){var e=new P(v);e._captureStackTrace();var r=arguments.length>1&&!!Object(arguments[1]).multiArgs,n=x(t)(j(e,r));return n===$&&e._rejectCallback(n.e,!0),e._isFateSealed()||e._setAsyncGuaranteed(),e},P.all=function(t){return new b(t).promise()},P.cast=function(t){var e=g(t);return e instanceof P||((e=new P(v))._captureStackTrace(),e._setFulfilled(),e._rejectionHandler0=t),e},P.resolve=P.fulfilled=P.cast,P.reject=P.rejected=function(t){var e=new P(v);return e._captureStackTrace(),e._rejectCallback(t,!0),e},P.setScheduler=function(t){if("function"!=typeof t)throw new y("expecting a function but got "+c.classString(t));return h.setScheduler(t)},P.prototype._then=function(t,e,r,n,i){var o=void 0!==i,s=o?i:new P(v),u=this._target(),l=u._bitField;o||(s._propagateFrom(this,3),s._captureStackTrace(),void 0===n&&0!=(2097152&this._bitField)&&(n=0!=(50397184&l)?this._boundValue():u===this?void 0:this._boundTo),this._fireEvent("promiseChained",this,s));var f=a();if(0!=(50397184&l)){var p,y,_=u._settlePromiseCtx;0!=(33554432&l)?(y=u._rejectionHandler0,p=t):0!=(16777216&l)?(y=u._fulfillmentHandler0,p=e,u._unsetRejectionIsUnhandled()):(_=u._settlePromiseLateCancellationObserver,y=new d("late cancellation observer"),u._attachExtraTrace(y),p=e),h.invoke(_,u,{handler:null===f?p:"function"==typeof p&&c.domainBind(f,p),promise:s,receiver:n,value:y})}else u._addCallbacks(t,e,s,n,f);return s},P.prototype._length=function(){return 65535&this._bitField},P.prototype._isFateSealed=function(){return 0!=(117506048&this._bitField)},P.prototype._isFollowing=function(){return 67108864==(67108864&this._bitField)},P.prototype._setLength=function(t){this._bitField=-65536&this._bitField|65535&t},P.prototype._setFulfilled=function(){this._bitField=33554432|this._bitField,this._fireEvent("promiseFulfilled",this)},P.prototype._setRejected=function(){this._bitField=16777216|this._bitField,this._fireEvent("promiseRejected",this)},P.prototype._setFollowing=function(){this._bitField=67108864|this._bitField,this._fireEvent("promiseResolved",this)},P.prototype._setIsFinal=function(){this._bitField=4194304|this._bitField},P.prototype._isFinal=function(){return(4194304&this._bitField)>0},P.prototype._unsetCancelled=function(){this._bitField=-65537&this._bitField},P.prototype._setCancelled=function(){this._bitField=65536|this._bitField,this._fireEvent("promiseCancelled",this)},P.prototype._setWillBeCancelled=function(){this._bitField=8388608|this._bitField},P.prototype._setAsyncGuaranteed=function(){h.hasCustomScheduler()||(this._bitField=134217728|this._bitField)},P.prototype._receiverAt=function(t){var e=0===t?this._receiver0:this[4*t-4+3];if(e!==u)return void 0===e&&this._isBound()?this._boundValue():e},P.prototype._promiseAt=function(t){return this[4*t-4+2]},P.prototype._fulfillmentHandlerAt=function(t){return this[4*t-4+0]},P.prototype._rejectionHandlerAt=function(t){return this[4*t-4+1]},P.prototype._boundValue=function(){},P.prototype._migrateCallback0=function(t){t._bitField;var e=t._fulfillmentHandler0,r=t._rejectionHandler0,n=t._promise0,i=t._receiverAt(0);void 0===i&&(i=u),this._addCallbacks(e,r,n,i,null)},P.prototype._migrateCallbackAt=function(t,e){var r=t._fulfillmentHandlerAt(e),n=t._rejectionHandlerAt(e),i=t._promiseAt(e),o=t._receiverAt(e);void 0===o&&(o=u),this._addCallbacks(r,n,i,o,null)},P.prototype._addCallbacks=function(t,e,r,n,i){var o=this._length();if(o>=65531&&(o=0,this._setLength(0)),0===o)this._promise0=r,this._receiver0=n,"function"==typeof t&&(this._fulfillmentHandler0=null===i?t:c.domainBind(i,t)),"function"==typeof e&&(this._rejectionHandler0=null===i?e:c.domainBind(i,e));else{var s=4*o-4;this[s+2]=r,this[s+3]=n,"function"==typeof t&&(this[s+0]=null===i?t:c.domainBind(i,t)),"function"==typeof e&&(this[s+1]=null===i?e:c.domainBind(i,e))}return this._setLength(o+1),o},P.prototype._proxy=function(t,e){this._addCallbacks(void 0,void 0,e,t,null)},P.prototype._resolveCallback=function(t,e){if(0==(117506048&this._bitField)){if(t===this)return this._rejectCallback(n(),!1);var r=g(t,this);if(!(r instanceof P))return this._fulfill(t);e&&this._propagateFrom(r,2);var i=r._target();if(i!==this){var o=i._bitField;if(0==(50397184&o)){var s=this._length();s>0&&i._migrateCallback0(this);for(var a=1;a<s;++a)i._migrateCallbackAt(this,a);this._setFollowing(),this._setLength(0),this._setFollowee(i)}else if(0!=(33554432&o))this._fulfill(i._value());else if(0!=(16777216&o))this._reject(i._reason());else{var u=new d("late cancellation observer");i._attachExtraTrace(u),this._reject(u)}}else this._reject(n())}},P.prototype._rejectCallback=function(t,e,r){var n=c.ensureErrorObject(t),i=n===t;if(!i&&!r&&S.warnings()){var o="a promise was rejected with a non-error: "+c.classString(t);this._warn(o,!0)}this._attachExtraTrace(n,!!e&&i),this._reject(t)},P.prototype._resolveFromExecutor=function(t){if(t!==v){var e=this;this._captureStackTrace(),this._pushContext();var r=!0,n=this._execute(t,function(t){e._resolveCallback(t)},function(t){e._rejectCallback(t,r)});r=!1,this._popContext(),void 0!==n&&e._rejectCallback(n,!0)}},P.prototype._settlePromiseFromHandler=function(t,e,r,n){var i=n._bitField;if(0==(65536&i)){var o;n._pushContext(),e===_?r&&"number"==typeof r.length?o=x(t).apply(this._boundValue(),r):(o=$).e=new y("cannot .spread() a non-array: "+c.classString(r)):o=x(t).call(e,r);var s=n._popContext();0==(65536&(i=n._bitField))&&(o===m?n._reject(r):o===$?n._rejectCallback(o.e,!1):(S.checkForgottenReturns(o,s,"",n,this),n._resolveCallback(o)))}},P.prototype._target=function(){for(var t=this;t._isFollowing();)t=t._followee();return t},P.prototype._followee=function(){return this._rejectionHandler0},P.prototype._setFollowee=function(t){this._rejectionHandler0=t},P.prototype._settlePromise=function(t,e,r,n){var o=t instanceof P,a=this._bitField,u=0!=(134217728&a);0!=(65536&a)?(o&&t._invokeInternalOnCancel(),r instanceof E&&r.isFinallyHandler()?(r.cancelPromise=t,x(e).call(r,n)===$&&t._reject($.e)):e===i?t._fulfill(i.call(r)):r instanceof s?r._promiseCancelled(t):o||t instanceof b?t._cancel():r.cancel()):"function"==typeof e?o?(u&&t._setAsyncGuaranteed(),this._settlePromiseFromHandler(e,r,n,t)):e.call(r,n,t):r instanceof s?r._isResolved()||(0!=(33554432&a)?r._promiseFulfilled(n,t):r._promiseRejected(n,t)):o&&(u&&t._setAsyncGuaranteed(),0!=(33554432&a)?t._fulfill(n):t._reject(n))},P.prototype._settlePromiseLateCancellationObserver=function(t){var e=t.handler,r=t.promise,n=t.receiver,i=t.value;"function"==typeof e?r instanceof P?this._settlePromiseFromHandler(e,n,i,r):e.call(n,i,r):r instanceof P&&r._reject(i)},P.prototype._settlePromiseCtx=function(t){this._settlePromise(t.promise,t.handler,t.receiver,t.value)},P.prototype._settlePromise0=function(t,e,r){var n=this._promise0,i=this._receiverAt(0);this._promise0=void 0,this._receiver0=void 0,this._settlePromise(n,t,i,e)},P.prototype._clearCallbackDataAtIndex=function(t){var e=4*t-4;this[e+2]=this[e+3]=this[e+0]=this[e+1]=void 0},P.prototype._fulfill=function(t){var e=this._bitField;if(!((117506048&e)>>>16)){if(t===this){var r=n();return this._attachExtraTrace(r),this._reject(r)}this._setFulfilled(),this._rejectionHandler0=t,(65535&e)>0&&(0!=(134217728&e)?this._settlePromises():h.settlePromises(this))}},P.prototype._reject=function(t){var e=this._bitField;if(!((117506048&e)>>>16)){if(this._setRejected(),this._fulfillmentHandler0=t,this._isFinal())return h.fatalError(t,c.isNode);(65535&e)>0?h.settlePromises(this):this._ensurePossibleRejectionHandled()}},P.prototype._fulfillPromises=function(t,e){for(var r=1;r<t;r++){var n=this._fulfillmentHandlerAt(r),i=this._promiseAt(r),o=this._receiverAt(r);this._clearCallbackDataAtIndex(r),this._settlePromise(i,n,o,e)}},P.prototype._rejectPromises=function(t,e){for(var r=1;r<t;r++){var n=this._rejectionHandlerAt(r),i=this._promiseAt(r),o=this._receiverAt(r);this._clearCallbackDataAtIndex(r),this._settlePromise(i,n,o,e)}},P.prototype._settlePromises=function(){var t=this._bitField,e=65535&t;if(e>0){if(0!=(16842752&t)){var r=this._fulfillmentHandler0;this._settlePromise0(this._rejectionHandler0,r,t),this._rejectPromises(e,r)}else{var n=this._rejectionHandler0;this._settlePromise0(this._fulfillmentHandler0,n,t),this._fulfillPromises(e,n)}this._setLength(0)}this._clearCancellationData()},P.prototype._settledValue=function(){var t=this._bitField;return 0!=(33554432&t)?this._rejectionHandler0:0!=(16777216&t)?this._fulfillmentHandler0:void 0},P.defer=P.pending=function(){return S.deprecated("Promise.defer","new Promise"),{promise:new P(v),resolve:N,reject:T}},c.notEnumerableProp(P,"_makeSelfResolutionError",n),t("./method")(P,v,g,o,S),t("./bind")(P,v,g,S),t("./cancel")(P,b,o,S),t("./direct_resolve")(P),t("./synchronous_inspection")(P),t("./join")(P,b,g,v,h,a),P.Promise=P,P.version="3.5.1",t("./map.js")(P,b,o,g,v,S),t("./call_get.js")(P),t("./using.js")(P,o,g,O,v,S),t("./timers.js")(P,v,S),t("./generators.js")(P,o,v,g,s,S),t("./nodeify.js")(P),t("./promisify.js")(P,v),t("./props.js")(P,b,g,o),t("./race.js")(P,v,g,o),t("./reduce.js")(P,b,o,g,v,S),t("./settle.js")(P,b,S),t("./some.js")(P,b,o),t("./filter.js")(P,v),t("./each.js")(P,v),t("./any.js")(P),c.toFastProperties(P),c.toFastProperties(P.prototype),k({a:1}),k({b:2}),k({c:3}),k(1),k(function(){}),k(void 0),k(!1),k(new P(v)),S.setBounds(f.firstLineError,c.lastLineError),P}},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(t,e,r){e.exports=function(e,r,n,i,o){var s=t("./util");s.isArray;function a(t){var n=this._promise=new e(r);t instanceof e&&n._propagateFrom(t,3),n._setOnCancel(this),this._values=t,this._length=0,this._totalResolved=0,this._init(void 0,-2)}return s.inherits(a,o),a.prototype.length=function(){return this._length},a.prototype.promise=function(){return this._promise},a.prototype._init=function t(r,o){var a=n(this._values,this._promise);if(a instanceof e){var u=(a=a._target())._bitField;if(this._values=a,0==(50397184&u))return this._promise._setAsyncGuaranteed(),a._then(t,this._reject,void 0,this,o);if(0==(33554432&u))return 0!=(16777216&u)?this._reject(a._reason()):this._cancel();a=a._value()}if(null!==(a=s.asArray(a)))0!==a.length?this._iterate(a):-5===o?this._resolveEmptyArray():this._resolve(function(t){switch(t){case-2:return[];case-3:return{};case-6:return new Map}}(o));else{var c=i("expecting an array or an iterable object but got "+s.classString(a)).reason();this._promise._rejectCallback(c,!1)}},a.prototype._iterate=function(t){var r=this.getActualLength(t.length);this._length=r,this._values=this.shouldCopyValues()?new Array(r):this._values;for(var i=this._promise,o=!1,s=null,a=0;a<r;++a){var u=n(t[a],i);s=u instanceof e?(u=u._target())._bitField:null,o?null!==s&&u.suppressUnhandledRejections():null!==s?0==(50397184&s)?(u._proxy(this,a),this._values[a]=u):o=0!=(33554432&s)?this._promiseFulfilled(u._value(),a):0!=(16777216&s)?this._promiseRejected(u._reason(),a):this._promiseCancelled(a):o=this._promiseFulfilled(u,a)}o||i._setAsyncGuaranteed()},a.prototype._isResolved=function(){return null===this._values},a.prototype._resolve=function(t){this._values=null,this._promise._fulfill(t)},a.prototype._cancel=function(){!this._isResolved()&&this._promise._isCancellable()&&(this._values=null,this._promise._cancel())},a.prototype._reject=function(t){this._values=null,this._promise._rejectCallback(t,!1)},a.prototype._promiseFulfilled=function(t,e){return this._values[e]=t,++this._totalResolved>=this._length&&(this._resolve(this._values),!0)},a.prototype._promiseCancelled=function(){return this._cancel(),!0},a.prototype._promiseRejected=function(t){return this._totalResolved++,this._reject(t),!0},a.prototype._resultCancelled=function(){if(!this._isResolved()){var t=this._values;if(this._cancel(),t instanceof e)t.cancel();else for(var r=0;r<t.length;++r)t[r]instanceof e&&t[r].cancel()}},a.prototype.shouldCopyValues=function(){return!0},a.prototype.getActualLength=function(t){return t},a}},{"./util":36}],24:[function(t,e,r){e.exports=function(e,r){var n={},i=t("./util"),o=t("./nodeback"),s=i.withAppended,a=i.maybeWrapAsError,c=i.canEvaluate,l=t("./errors").TypeError,f={__isPromisified__:!0},h=new RegExp("^(?:"+["arity","length","name","arguments","caller","callee","prototype","__isPromisified__"].join("|")+")$"),p=function(t){return i.isIdentifier(t)&&"_"!==t.charAt(0)&&"constructor"!==t};function y(t){return!h.test(t)}function d(t){try{return!0===t.__isPromisified__}catch(t){return!1}}function v(t,e,r){var n=i.getDataPropertyOrDefault(t,e+r,f);return!!n&&d(n)}function _(t,e,r,n){for(var o=i.inheritedDataKeys(t),s=[],a=0;a<o.length;++a){var u=o[a],c=t[u],f=n===p||p(u,c,t);"function"!=typeof c||d(c)||v(t,u,e)||!n(u,c,t,f)||s.push(u,c)}return function(t,e,r){for(var n=0;n<t.length;n+=2){var i=t[n];if(r.test(i))for(var o=i.replace(r,""),s=0;s<t.length;s+=2)if(t[s]===o)throw new l("Cannot promisify an API that has normal methods with '%s'-suffix\n\n    See http://goo.gl/MqrFmX\n".replace("%s",e))}}(s,e,r),s}var m=function(t){return t.replace(/([$])/,"\\$")};var g=c?void 0:function(t,u,c,l,f,h){var p=function(){return this}(),y=t;function d(){var i=u;u===n&&(i=this);var c=new e(r);c._captureStackTrace();var l="string"==typeof y&&this!==p?this[y]:t,f=o(c,h);try{l.apply(i,s(arguments,f))}catch(t){c._rejectCallback(a(t),!0,!0)}return c._isFateSealed()||c._setAsyncGuaranteed(),c}return"string"==typeof y&&(t=l),i.notEnumerableProp(d,"__isPromisified__",!0),d};function b(t,e,r,o,s){for(var a=new RegExp(m(e)+"$"),u=_(t,e,a,r),c=0,l=u.length;c<l;c+=2){var f=u[c],h=u[c+1],p=f+e;if(o===g)t[p]=g(f,n,f,h,e,s);else{var y=o(h,function(){return g(f,n,f,h,e,s)});i.notEnumerableProp(y,"__isPromisified__",!0),t[p]=y}}return i.toFastProperties(t),t}e.promisify=function(t,e){if("function"!=typeof t)throw new l("expecting a function but got "+i.classString(t));if(d(t))return t;var r=function(t,e,r){return g(t,e,void 0,t,null,r)}(t,void 0===(e=Object(e)).context?n:e.context,!!e.multiArgs);return i.copyDescriptors(t,r,y),r},e.promisifyAll=function(t,e){if("function"!=typeof t&&"object"!==(void 0===t?"undefined":u(t)))throw new l("the target of promisifyAll must be an object or a function\n\n    See http://goo.gl/MqrFmX\n");var r=!!(e=Object(e)).multiArgs,n=e.suffix;"string"!=typeof n&&(n="Async");var o=e.filter;"function"!=typeof o&&(o=p);var s=e.promisifier;if("function"!=typeof s&&(s=g),!i.isIdentifier(n))throw new RangeError("suffix must be a valid identifier\n\n    See http://goo.gl/MqrFmX\n");for(var a=i.inheritedDataKeys(t),c=0;c<a.length;++c){var f=t[a[c]];"constructor"!==a[c]&&i.isClass(f)&&(b(f.prototype,n,o,s,r),b(f,n,o,s,r))}return b(t,n,o,s,r)}}},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(t,e,r){e.exports=function(e,r,n,i){var o,s=t("./util"),a=s.isObject,u=t("./es5");"function"==typeof Map&&(o=Map);var c=function(){var t=0,e=0;function r(r,n){this[t]=r,this[t+e]=n,t++}return function(n){e=n.size,t=0;var i=new Array(2*n.size);return n.forEach(r,i),i}}();function l(t){var e,r=!1;if(void 0!==o&&t instanceof o)e=c(t),r=!0;else{var n=u.keys(t),i=n.length;e=new Array(2*i);for(var s=0;s<i;++s){var a=n[s];e[s]=t[a],e[s+i]=a}}this.constructor$(e),this._isMap=r,this._init$(void 0,r?-6:-3)}function f(t){var r,o=n(t);return a(o)?(r=o instanceof e?o._then(e.props,void 0,void 0,void 0,void 0):new l(o).promise(),o instanceof e&&r._propagateFrom(o,2),r):i("cannot await properties of a non-object\n\n    See http://goo.gl/MqrFmX\n")}s.inherits(l,r),l.prototype._init=function(){},l.prototype._promiseFulfilled=function(t,e){if(this._values[e]=t,++this._totalResolved>=this._length){var r;if(this._isMap)r=function(t){for(var e=new o,r=t.length/2|0,n=0;n<r;++n){var i=t[r+n],s=t[n];e.set(i,s)}return e}(this._values);else{r={};for(var n=this.length(),i=0,s=this.length();i<s;++i)r[this._values[i+n]]=this._values[i]}return this._resolve(r),!0}return!1},l.prototype.shouldCopyValues=function(){return!1},l.prototype.getActualLength=function(t){return t>>1},e.prototype.props=function(){return f(this)},e.props=function(t){return f(t)}}},{"./es5":13,"./util":36}],26:[function(t,e,r){function n(t){this._capacity=t,this._length=0,this._front=0}n.prototype._willBeOverCapacity=function(t){return this._capacity<t},n.prototype._pushOne=function(t){var e=this.length();this._checkCapacity(e+1),this[this._front+e&this._capacity-1]=t,this._length=e+1},n.prototype.push=function(t,e,r){var n=this.length()+3;if(this._willBeOverCapacity(n))return this._pushOne(t),this._pushOne(e),void this._pushOne(r);var i=this._front+n-3;this._checkCapacity(n);var o=this._capacity-1;this[i+0&o]=t,this[i+1&o]=e,this[i+2&o]=r,this._length=n},n.prototype.shift=function(){var t=this._front,e=this[t];return this[t]=void 0,this._front=t+1&this._capacity-1,this._length--,e},n.prototype.length=function(){return this._length},n.prototype._checkCapacity=function(t){this._capacity<t&&this._resizeTo(this._capacity<<1)},n.prototype._resizeTo=function(t){var e=this._capacity;this._capacity=t,function(t,e,r,n,i){for(var o=0;o<i;++o)r[o+n]=t[o+e],t[o+e]=void 0}(this,0,this,e,this._front+this._length&e-1)},e.exports=n},{}],27:[function(t,e,r){e.exports=function(e,r,n,i){var o=t("./util"),s=function(t){return t.then(function(e){return a(e,t)})};function a(t,a){var u=n(t);if(u instanceof e)return s(u);if(null===(t=o.asArray(t)))return i("expecting an array or an iterable object but got "+o.classString(t));var c=new e(r);void 0!==a&&c._propagateFrom(a,3);for(var l=c._fulfill,f=c._reject,h=0,p=t.length;h<p;++h){var y=t[h];(void 0!==y||h in t)&&e.cast(y)._then(l,f,void 0,c,null)}return c}e.race=function(t){return a(t,void 0)},e.prototype.race=function(){return a(this,void 0)}}},{"./util":36}],28:[function(t,e,r){e.exports=function(e,r,n,i,o,s){var a=e._getDomain,u=t("./util"),c=u.tryCatch;function l(t,r,n,i){this.constructor$(t);var s=a();this._fn=null===s?r:u.domainBind(s,r),void 0!==n&&(n=e.resolve(n))._attachCancellationCallback(this),this._initialValue=n,this._currentCancellable=null,this._eachValues=i===o?Array(this._length):0===i?null:void 0,this._promise._captureStackTrace(),this._init$(void 0,-5)}function f(t,e){this.isFulfilled()?e._resolve(t):e._reject(t)}function h(t,e,r,i){return"function"!=typeof e?n("expecting a function but got "+u.classString(e)):new l(t,e,r,i).promise()}function p(t){this.accum=t,this.array._gotAccum(t);var r=i(this.value,this.array._promise);return r instanceof e?(this.array._currentCancellable=r,r._then(y,void 0,void 0,this,void 0)):y.call(this,r)}function y(t){var r,n=this.array,i=n._promise,o=c(n._fn);i._pushContext(),(r=void 0!==n._eachValues?o.call(i._boundValue(),t,this.index,this.length):o.call(i._boundValue(),this.accum,t,this.index,this.length))instanceof e&&(n._currentCancellable=r);var a=i._popContext();return s.checkForgottenReturns(r,a,void 0!==n._eachValues?"Promise.each":"Promise.reduce",i),r}u.inherits(l,r),l.prototype._gotAccum=function(t){void 0!==this._eachValues&&null!==this._eachValues&&t!==o&&this._eachValues.push(t)},l.prototype._eachComplete=function(t){return null!==this._eachValues&&this._eachValues.push(t),this._eachValues},l.prototype._init=function(){},l.prototype._resolveEmptyArray=function(){this._resolve(void 0!==this._eachValues?this._eachValues:this._initialValue)},l.prototype.shouldCopyValues=function(){return!1},l.prototype._resolve=function(t){this._promise._resolveCallback(t),this._values=null},l.prototype._resultCancelled=function(t){if(t===this._initialValue)return this._cancel();this._isResolved()||(this._resultCancelled$(),this._currentCancellable instanceof e&&this._currentCancellable.cancel(),this._initialValue instanceof e&&this._initialValue.cancel())},l.prototype._iterate=function(t){var r,n;this._values=t;var i=t.length;if(void 0!==this._initialValue?(r=this._initialValue,n=0):(r=e.resolve(t[0]),n=1),this._currentCancellable=r,!r.isRejected())for(;n<i;++n){var o={accum:null,value:t[n],index:n,length:i,array:this};r=r._then(p,void 0,void 0,o,void 0)}void 0!==this._eachValues&&(r=r._then(this._eachComplete,void 0,void 0,this,void 0)),r._then(f,f,void 0,r,this)},e.prototype.reduce=function(t,e){return h(this,t,e,null)},e.reduce=function(t,e,r,n){return h(t,e,r,n)}}},{"./util":36}],29:[function(t,e,o){var s,a=t("./util"),u=a.getNativePromise();if(a.isNode&&"undefined"==typeof MutationObserver){var c=n.setImmediate,l=r.nextTick;s=a.isRecentNode?function(t){c.call(n,t)}:function(t){l.call(r,t)}}else if("function"==typeof u&&"function"==typeof u.resolve){var f=u.resolve();s=function(t){f.then(t)}}else s="undefined"==typeof MutationObserver||"undefined"!=typeof window&&window.navigator&&(window.navigator.standalone||window.cordova)?void 0!==i?function(t){i(t)}:"undefined"!=typeof setTimeout?function(t){setTimeout(t,0)}:function(){throw new Error("No async scheduler available\n\n    See http://goo.gl/MqrFmX\n")}:function(){var t=document.createElement("div"),e={attributes:!0},r=!1,n=document.createElement("div");new MutationObserver(function(){t.classList.toggle("foo"),r=!1}).observe(n,e);return function(i){var o=new MutationObserver(function(){o.disconnect(),i()});o.observe(t,e),r||(r=!0,n.classList.toggle("foo"))}}();e.exports=s},{"./util":36}],30:[function(t,e,r){e.exports=function(e,r,n){var i=e.PromiseInspection;function o(t){this.constructor$(t)}t("./util").inherits(o,r),o.prototype._promiseResolved=function(t,e){return this._values[t]=e,++this._totalResolved>=this._length&&(this._resolve(this._values),!0)},o.prototype._promiseFulfilled=function(t,e){var r=new i;return r._bitField=33554432,r._settledValueField=t,this._promiseResolved(e,r)},o.prototype._promiseRejected=function(t,e){var r=new i;return r._bitField=16777216,r._settledValueField=t,this._promiseResolved(e,r)},e.settle=function(t){return n.deprecated(".settle()",".reflect()"),new o(t).promise()},e.prototype.settle=function(){return e.settle(this)}}},{"./util":36}],31:[function(t,e,r){e.exports=function(e,r,n){var i=t("./util"),o=t("./errors").RangeError,s=t("./errors").AggregateError,a=i.isArray,u={};function c(t){this.constructor$(t),this._howMany=0,this._unwrap=!1,this._initialized=!1}function l(t,e){if((0|e)!==e||e<0)return n("expecting a positive integer\n\n    See http://goo.gl/MqrFmX\n");var r=new c(t),i=r.promise();return r.setHowMany(e),r.init(),i}i.inherits(c,r),c.prototype._init=function(){if(this._initialized)if(0!==this._howMany){this._init$(void 0,-5);var t=a(this._values);!this._isResolved()&&t&&this._howMany>this._canPossiblyFulfill()&&this._reject(this._getRangeError(this.length()))}else this._resolve([])},c.prototype.init=function(){this._initialized=!0,this._init()},c.prototype.setUnwrap=function(){this._unwrap=!0},c.prototype.howMany=function(){return this._howMany},c.prototype.setHowMany=function(t){this._howMany=t},c.prototype._promiseFulfilled=function(t){return this._addFulfilled(t),this._fulfilled()===this.howMany()&&(this._values.length=this.howMany(),1===this.howMany()&&this._unwrap?this._resolve(this._values[0]):this._resolve(this._values),!0)},c.prototype._promiseRejected=function(t){return this._addRejected(t),this._checkOutcome()},c.prototype._promiseCancelled=function(){return this._values instanceof e||null==this._values?this._cancel():(this._addRejected(u),this._checkOutcome())},c.prototype._checkOutcome=function(){if(this.howMany()>this._canPossiblyFulfill()){for(var t=new s,e=this.length();e<this._values.length;++e)this._values[e]!==u&&t.push(this._values[e]);return t.length>0?this._reject(t):this._cancel(),!0}return!1},c.prototype._fulfilled=function(){return this._totalResolved},c.prototype._rejected=function(){return this._values.length-this.length()},c.prototype._addRejected=function(t){this._values.push(t)},c.prototype._addFulfilled=function(t){this._values[this._totalResolved++]=t},c.prototype._canPossiblyFulfill=function(){return this.length()-this._rejected()},c.prototype._getRangeError=function(t){var e="Input array must contain at least "+this._howMany+" items but contains only "+t+" items";return new o(e)},c.prototype._resolveEmptyArray=function(){this._reject(this._getRangeError(0))},e.some=function(t,e){return l(t,e)},e.prototype.some=function(t){return l(this,t)},e._SomePromiseArray=c}},{"./errors":12,"./util":36}],32:[function(t,e,r){e.exports=function(t){function e(t){void 0!==t?(t=t._target(),this._bitField=t._bitField,this._settledValueField=t._isFateSealed()?t._settledValue():void 0):(this._bitField=0,this._settledValueField=void 0)}e.prototype._settledValue=function(){return this._settledValueField};var r=e.prototype.value=function(){if(!this.isFulfilled())throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\n\n    See http://goo.gl/MqrFmX\n");return this._settledValue()},n=e.prototype.error=e.prototype.reason=function(){if(!this.isRejected())throw new TypeError("cannot get rejection reason of a non-rejected promise\n\n    See http://goo.gl/MqrFmX\n");return this._settledValue()},i=e.prototype.isFulfilled=function(){return 0!=(33554432&this._bitField)},o=e.prototype.isRejected=function(){return 0!=(16777216&this._bitField)},s=e.prototype.isPending=function(){return 0==(50397184&this._bitField)},a=e.prototype.isResolved=function(){return 0!=(50331648&this._bitField)};e.prototype.isCancelled=function(){return 0!=(8454144&this._bitField)},t.prototype.__isCancelled=function(){return 65536==(65536&this._bitField)},t.prototype._isCancelled=function(){return this._target().__isCancelled()},t.prototype.isCancelled=function(){return 0!=(8454144&this._target()._bitField)},t.prototype.isPending=function(){return s.call(this._target())},t.prototype.isRejected=function(){return o.call(this._target())},t.prototype.isFulfilled=function(){return i.call(this._target())},t.prototype.isResolved=function(){return a.call(this._target())},t.prototype.value=function(){return r.call(this._target())},t.prototype.reason=function(){var t=this._target();return t._unsetRejectionIsUnhandled(),n.call(t)},t.prototype._value=function(){return this._settledValue()},t.prototype._reason=function(){return this._unsetRejectionIsUnhandled(),this._settledValue()},t.PromiseInspection=e}},{}],33:[function(t,e,r){e.exports=function(e,r){var n=t("./util"),i=n.errorObj,o=n.isObject;var s={}.hasOwnProperty;return function(t,a){if(o(t)){if(t instanceof e)return t;var u=function(t){try{return function(t){return t.then}(t)}catch(t){return i.e=t,i}}(t);if(u===i){a&&a._pushContext();var c=e.reject(u.e);return a&&a._popContext(),c}if("function"==typeof u)return function(t){try{return s.call(t,"_promise0")}catch(t){return!1}}(t)?(c=new e(r),t._then(c._fulfill,c._reject,void 0,c,null),c):function(t,o,s){var a=new e(r),u=a;s&&s._pushContext(),a._captureStackTrace(),s&&s._popContext();var c=!0,l=n.tryCatch(o).call(t,function(t){a&&(a._resolveCallback(t),a=null)},function(t){a&&(a._rejectCallback(t,c,!0),a=null)});return c=!1,a&&l===i&&(a._rejectCallback(l.e,!0,!0),a=null),u}(t,u,a)}return t}}},{"./util":36}],34:[function(t,e,r){e.exports=function(e,r,n){var i=t("./util"),o=e.TimeoutError;function s(t){this.handle=t}s.prototype._resultCancelled=function(){clearTimeout(this.handle)};var a=function(t){return u(+this).thenReturn(t)},u=e.delay=function(t,i){var o,u;return void 0!==i?(o=e.resolve(i)._then(a,null,null,t,void 0),n.cancellation()&&i instanceof e&&o._setOnCancel(i)):(o=new e(r),u=setTimeout(function(){o._fulfill()},+t),n.cancellation()&&o._setOnCancel(new s(u)),o._captureStackTrace()),o._setAsyncGuaranteed(),o};e.prototype.delay=function(t){return u(t,this)};function c(t){return clearTimeout(this.handle),t}function l(t){throw clearTimeout(this.handle),t}e.prototype.timeout=function(t,e){var r,a;t=+t;var u=new s(setTimeout(function(){r.isPending()&&function(t,e,r){var n;n="string"!=typeof e?e instanceof Error?e:new o("operation timed out"):new o(e),i.markAsOriginatingFromRejection(n),t._attachExtraTrace(n),t._reject(n),null!=r&&r.cancel()}(r,e,a)},t));return n.cancellation()?(a=this.then(),(r=a._then(c,l,void 0,u,void 0))._setOnCancel(u)):r=this._then(c,l,void 0,u,void 0),r}}},{"./util":36}],35:[function(t,e,r){e.exports=function(e,r,n,i,o,s){var a=t("./util"),u=t("./errors").TypeError,c=t("./util").inherits,l=a.errorObj,f=a.tryCatch,h={};function p(t){setTimeout(function(){throw t},0)}function y(t,r){var i=0,s=t.length,a=new e(o);return function o(){if(i>=s)return a._fulfill();var u=function(t){var e=n(t);return e!==t&&"function"==typeof t._isDisposable&&"function"==typeof t._getDisposer&&t._isDisposable()&&e._setDisposable(t._getDisposer()),e}(t[i++]);if(u instanceof e&&u._isDisposable()){try{u=n(u._getDisposer().tryDispose(r),t.promise)}catch(t){return p(t)}if(u instanceof e)return u._then(o,p,null,null,null)}o()}(),a}function d(t,e,r){this._data=t,this._promise=e,this._context=r}function v(t,e,r){this.constructor$(t,e,r)}function _(t){return d.isDisposer(t)?(this.resources[this.index]._setDisposable(t),t.promise()):t}function m(t){this.length=t,this.promise=null,this[t-1]=null}d.prototype.data=function(){return this._data},d.prototype.promise=function(){return this._promise},d.prototype.resource=function(){return this.promise().isFulfilled()?this.promise().value():h},d.prototype.tryDispose=function(t){var e=this.resource(),r=this._context;void 0!==r&&r._pushContext();var n=e!==h?this.doDispose(e,t):null;return void 0!==r&&r._popContext(),this._promise._unsetDisposable(),this._data=null,n},d.isDisposer=function(t){return null!=t&&"function"==typeof t.resource&&"function"==typeof t.tryDispose},c(v,d),v.prototype.doDispose=function(t,e){return this.data().call(t,t,e)},m.prototype._resultCancelled=function(){for(var t=this.length,r=0;r<t;++r){var n=this[r];n instanceof e&&n.cancel()}},e.using=function(){var t=arguments.length;if(t<2)return r("you must pass at least 2 arguments to Promise.using");var i,o=arguments[t-1];if("function"!=typeof o)return r("expecting a function but got "+a.classString(o));var u=!0;2===t&&Array.isArray(arguments[0])?(t=(i=arguments[0]).length,u=!1):(i=arguments,t--);for(var c=new m(t),h=0;h<t;++h){var p=i[h];if(d.isDisposer(p)){var v=p;(p=p.promise())._setDisposable(v)}else{var g=n(p);g instanceof e&&(p=g._then(_,null,null,{resources:c,index:h},void 0))}c[h]=p}var b=new Array(c.length);for(h=0;h<b.length;++h)b[h]=e.resolve(c[h]).reflect();var w=e.all(b).then(function(t){for(var e=0;e<t.length;++e){var r=t[e];if(r.isRejected())return l.e=r.error(),l;if(!r.isFulfilled())return void w.cancel();t[e]=r.value()}O._pushContext(),o=f(o);var n=u?o.apply(void 0,t):o(t),i=O._popContext();return s.checkForgottenReturns(n,i,"Promise.using",O),n}),O=w.lastly(function(){var t=new e.PromiseInspection(w);return y(c,t)});return c.promise=O,O._setOnCancel(c),O},e.prototype._setDisposable=function(t){this._bitField=131072|this._bitField,this._disposer=t},e.prototype._isDisposable=function(){return(131072&this._bitField)>0},e.prototype._getDisposer=function(){return this._disposer},e.prototype._unsetDisposable=function(){this._bitField=-131073&this._bitField,this._disposer=void 0},e.prototype.disposer=function(t){if("function"==typeof t)return new v(t,this,i());throw new u}}},{"./errors":12,"./util":36}],36:[function(t,e,i){var o=t("./es5"),s="undefined"==typeof navigator,a={e:{}},c,l="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==n?n:void 0!==this?this:null;function f(){try{var t=c;return c=null,t.apply(this,arguments)}catch(t){return a.e=t,a}}function h(t){return c=t,f}var p=function(t,e){var r={}.hasOwnProperty;function n(){for(var n in this.constructor=t,this.constructor$=e,e.prototype)r.call(e.prototype,n)&&"$"!==n.charAt(n.length-1)&&(this[n+"$"]=e.prototype[n])}return n.prototype=e.prototype,t.prototype=new n,t.prototype};function y(t){return null==t||!0===t||!1===t||"string"==typeof t||"number"==typeof t}function d(t){return"function"==typeof t||"object"===(void 0===t?"undefined":u(t))&&null!==t}function v(t){return y(t)?new Error(x(t)):t}function _(t,e){var r,n=t.length,i=new Array(n+1);for(r=0;r<n;++r)i[r]=t[r];return i[r]=e,i}function m(t,e,r){if(!o.isES5)return{}.hasOwnProperty.call(t,e)?t[e]:void 0;var n=Object.getOwnPropertyDescriptor(t,e);return null!=n?null==n.get&&null==n.set?n.value:r:void 0}function g(t,e,r){if(y(t))return t;var n={value:r,configurable:!0,enumerable:!1,writable:!0};return o.defineProperty(t,e,n),t}function b(t){throw t}var w=function(){var t=[Array.prototype,Object.prototype,Function.prototype],e=function(e){for(var r=0;r<t.length;++r)if(t[r]===e)return!0;return!1};if(o.isES5){var r=Object.getOwnPropertyNames;return function(t){for(var n=[],i=Object.create(null);null!=t&&!e(t);){var s;try{s=r(t)}catch(t){return n}for(var a=0;a<s.length;++a){var u=s[a];if(!i[u]){i[u]=!0;var c=Object.getOwnPropertyDescriptor(t,u);null!=c&&null==c.get&&null==c.set&&n.push(u)}}t=o.getPrototypeOf(t)}return n}}var n={}.hasOwnProperty;return function(r){if(e(r))return[];var i=[];t:for(var o in r)if(n.call(r,o))i.push(o);else{for(var s=0;s<t.length;++s)if(n.call(t[s],o))continue t;i.push(o)}return i}}(),O=/this\s*\.\s*\S+\s*=/;function S(t){try{if("function"==typeof t){var e=o.names(t.prototype),r=o.isES5&&e.length>1,n=e.length>0&&!(1===e.length&&"constructor"===e[0]),i=O.test(t+"")&&o.names(t).length>0;if(r||n||i)return!0}return!1}catch(t){return!1}}function E(t){function e(){}e.prototype=t;for(var r=8;r--;)new e;return t}var A=/^[a-z$_][a-z$_0-9]*$/i;function j(t){return A.test(t)}function $(t,e,r){for(var n=new Array(t),i=0;i<t;++i)n[i]=e+i+r;return n}function x(t){try{return t+""}catch(t){return"[no string representation]"}}function P(t){return t instanceof Error||null!==t&&"object"===(void 0===t?"undefined":u(t))&&"string"==typeof t.message&&"string"==typeof t.name}function N(t){try{g(t,"isOperational",!0)}catch(t){}}function T(t){return null!=t&&(t instanceof Error.__BluebirdErrorTypes__.OperationalError||!0===t.isOperational)}function k(t){return P(t)&&o.propertyIsWritable(t,"stack")}var B="stack"in new Error?function(t){return k(t)?t:new Error(x(t))}:function(t){if(k(t))return t;try{throw new Error(x(t))}catch(t){return t}};function C(t){return{}.toString.call(t)}function D(t,e,r){for(var n=o.names(t),i=0;i<n.length;++i){var s=n[i];if(r(s))try{o.defineProperty(e,s,o.getDescriptor(t,s))}catch(t){}}}var M=function(t){return o.isArray(t)?t:null};if("undefined"!=typeof Symbol&&Symbol.iterator){var R="function"==typeof Array.from?function(t){return Array.from(t)}:function(t){for(var e,r=[],n=t[Symbol.iterator]();!(e=n.next()).done;)r.push(e.value);return r};M=function(t){return o.isArray(t)?t:null!=t&&"function"==typeof t[Symbol.iterator]?R(t):null}}var F=void 0!==r&&"[object process]"===C(r).toLowerCase(),I=void 0!==r&&void 0!==r.env;function L(t){return I?r.env[t]:void 0}function U(){if("function"==typeof Promise)try{var t=new Promise(function(){});if("[object Promise]"==={}.toString.call(t))return Promise}catch(t){}}function V(t,e){return t.bind(e)}var q={isClass:S,isIdentifier:j,inheritedDataKeys:w,getDataPropertyOrDefault:m,thrower:b,isArray:o.isArray,asArray:M,notEnumerableProp:g,isPrimitive:y,isObject:d,isError:P,canEvaluate:s,errorObj:a,tryCatch:h,inherits:p,withAppended:_,maybeWrapAsError:v,toFastProperties:E,filledRange:$,toString:x,canAttachTrace:k,ensureErrorObject:B,originatesFromRejection:T,markAsOriginatingFromRejection:N,classString:C,copyDescriptors:D,hasDevTools:"undefined"!=typeof chrome&&chrome&&"function"==typeof chrome.loadTimes,isNode:F,hasEnvVariables:I,env:L,global:l,getNativePromise:U,domainBind:V};q.isRecentNode=q.isNode&&function(){var t=r.versions.node.split(".").map(Number);return 0===t[0]&&t[1]>10||t[0]>0}(),q.isNode&&q.toFastProperties(r);try{throw new Error}catch(t){q.lastLineError=t}e.exports=q},{"./es5":13}]},{},[4])(4)}),"undefined"!=typeof window&&null!==window?window.P=window.Promise:"undefined"!=typeof self&&null!==self&&(self.P=self.Promise)}).call(this,r(8),r(11),r(68).setImmediate)},function(t,e,r){"use strict";var n=t.exports={};n.DocumentNotFoundError=null,n.general={},n.general.default="Validator failed for path `{PATH}` with value `{VALUE}`",n.general.required="Path `{PATH}` is required.",n.Number={},n.Number.min="Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).",n.Number.max="Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).",n.Number.enum="`{VALUE}` is not a valid enum value for path `{PATH}`.",n.Date={},n.Date.min="Path `{PATH}` ({VALUE}) is before minimum allowed value ({MIN}).",n.Date.max="Path `{PATH}` ({VALUE}) is after maximum allowed value ({MAX}).",n.String={},n.String.enum="`{VALUE}` is not a valid enum value for path `{PATH}`.",n.String.match="Path `{PATH}` is invalid ({VALUE}).",n.String.minlength="Path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).",n.String.maxlength="Path `{PATH}` (`{VALUE}`) is longer than the maximum allowed length ({MAXLENGTH})."},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=r(3),o=function(t){
/*!
   * OverwriteModel Error constructor.
   */
function e(t,r,o,s){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var a=void 0,u=n.messages;a=null!=u.DocumentNotFoundError?"function"==typeof u.DocumentNotFoundError?u.DocumentNotFoundError(t,r):u.DocumentNotFoundError:'No document found for query "'+i.inspect(t)+'" on model "'+r+'"';var c=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,a));return c.result=s,c.numAffected=o,c.filter=t,c.query=t,c}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(o.prototype,"name",{value:"DocumentNotFoundError"}),
/*!
 * exports
 */
t.exports=o},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){function e(t,r,n){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var i=n.join(", "),o=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,'No matching document found for id "'+t._id+'" version '+r+' modifiedPaths "'+i+'"'));return o.version=r,o.modifiedPaths=n,o}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"VersionError"}),
/*!
 * exports
 */
t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);return function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,"Can't save() the same doc multiple times in parallel. Document: "+t._id))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"ParallelSaveError"}),
/*!
 * exports
 */
t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){
/*!
   * OverwriteModel Error constructor.
   * @param {String} name
   */
function e(t){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,"Cannot overwrite `"+t+"` model once compiled."))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"OverwriteModelError"}),
/*!
 * exports
 */
t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){
/*!
   * MissingSchema Error constructor.
   * @param {String} name
   */
function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var r="Schema hasn't been registered for model \""+t+'".\nUse mongoose.model(name, schema)';return function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,r))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"MissingSchemaError"}),
/*!
 * exports
 */
t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){
/*!
   * DivergentArrayError constructor.
   * @param {Array<String>} paths
   */
function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var r="For your own good, using `document.save()` to update an array which was selected using an $elemMatch projection OR populated using skip, limit, query conditions, or exclusion of the _id field when the operation results in a $pop or $set of the entire array is not supported. The following path(s) would have been modified unsafely:\n  "+t.join("\n  ")+"\nUse Model.update() to update these arrays instead.";return function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,r))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"DivergentArrayError"}),
/*!
 * exports
 */
t.exports=i},function(t,e,r){"use strict";var n=r(30);
/*!
 * ignore
 */t.exports=function(t){t.$immutable?(t.$immutableSetter=function(t,e){return function(r){if(null==this||null==this.$__)return r;if(this.isNew)return r;var i="function"==typeof e?e.call(this,this):e;if(!i)return r;if("throw"===this.$__.strictMode&&r!==this[t])throw new n(t,"Path `"+t+"` is immutable and strict mode is set to throw.",!0);return this[t]}}(t.path,t.options.immutable),t.set(t.$immutableSetter)):t.$immutableSetter&&(t.setters=t.setters.filter(function(e){return e!==t.$immutableSetter}),delete t.$immutableSetter)}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(4),i=function(t){function e(t,r,n){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,'Parameter "'+r+'" to '+n+"() must be an object, got "+t.toString()))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"ObjectParameterError"}),t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(16),i=function(t){function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);return function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,"Can't validate() the same doc multiple times in parallel. Document: "+t._id))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}();Object.defineProperty(i.prototype,"name",{value:"ParallelValidateError"}),
/*!
 * exports
 */
t.exports=i},function(t,e,r){"use strict";(function(e){var r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};function n(){this._pres=new Map,this._posts=new Map}function i(t,e,r,n,i,o,s){if(o.useErrorHandlers){var a={error:e};return t.execPost(r,n,i,a,function(t){return"function"==typeof s&&s(t)})}return"function"==typeof s?s(e):void 0}function o(t,e,r){return t.has(e)?t.get(e):r}function s(t,e,r,n){var i=void 0;try{i=t.apply(e,r)}catch(t){return n(t)}a(i)&&i.then(function(){return n()},function(t){return n(t)})}function a(t){return null!=t&&"function"==typeof t.then}function u(t){var r=!1,n=this;return function(){var i=arguments;if(!r)return r=!0,e.nextTick(function(){return t.apply(n,i)})}}n.prototype.execPre=function(t,r,n,i){3===arguments.length&&(i=n,n=[]);var c=o(this._pres,t,[]),l=c.length,f=0,h=c.numAsync||0,p=!1,y=n;if(!l)return e.nextTick(function(){i(null)});var d=function t(){if(!(f>=l)){var n=c[f];if(n.isAsync){var o=[u(v),u(function(t){if(t){if(p)return;return p=!0,i(t)}if(0==--h&&f>=l)return i(null)})];s(n.fn,r,o,o[0])}else if(n.fn.length>0){o=[u(v)];for(var d=arguments.length>=2?arguments:[null].concat(y),_=1;_<d.length;++_)o.push(d[_]);s(n.fn,r,o,o[0])}else{var m=null,g=null;try{g=n.fn.call(r)}catch(t){m=t}if(a(g))g.then(function(){return v()},function(t){return v(t)});else{if(++f>=l)return h>0?void 0:e.nextTick(function(){i(m)});t(m)}}}};function v(t){if(t){if(p)return;return p=!0,i(t)}if(++f>=l)return h>0?void 0:i(null);d.apply(r,arguments)}d.apply(null,[null].concat(n))},n.prototype.execPreSync=function(t,e,r){for(var n=o(this._pres,t,[]),i=n.length,s=0;s<i;++s)n[s].fn.apply(e,r||[])},n.prototype.execPost=function(t,r,n,i,c){arguments.length<5&&(c=i,i=null);var l=o(this._posts,t,[]),f=l.length,h=0,p=null;if(i&&i.error&&(p=i.error),!f)return e.nextTick(function(){c.apply(null,[p].concat(n))});!function t(){for(var e=l[h].fn,i=0,o=n.length,y=[],d=0;d<o;++d)i+=n[d]&&n[d]._kareemIgnore?0:1,n[d]&&n[d]._kareemIgnore||y.push(n[d]);if(p)if(e.length===i+2){var v=u(function(e){if(e&&(p=e),++h>=f)return c.call(null,p);t()});s(e,r,[p].concat(y).concat([v]),v)}else{if(++h>=f)return c.call(null,p);t()}else{var _=u(function(e){return e?(p=e,t()):++h>=f?c.apply(null,[null].concat(n)):void t()});if(e.length===i+2)return++h>=f?c.apply(null,[null].concat(n)):t();if(e.length===i+1)s(e,r,y.concat([_]),_);else{var m=void 0,g=void 0;try{g=e.apply(r,y)}catch(t){m=t,p=t}if(a(g))return g.then(function(){return _()},function(t){return _(t)});if(++h>=f)return c.apply(null,[m].concat(n));t()}}}()},n.prototype.execPostSync=function(t,e,r){for(var n=o(this._posts,t,[]),i=n.length,s=0;s<i;++s)n[s].fn.apply(e,r||[])},n.prototype.createWrapperSync=function(t,e){var r=this;return function(){r.execPreSync(t,this,arguments);var n=e.apply(this,arguments);return r.execPostSync(t,this,[n]),n}},n.prototype.wrap=function(t,e,r,n,o){var s=n.length>0?n[n.length-1]:null,a=("function"==typeof s&&n.slice(0,n.length-1),this),u=(o=o||{}).checkForPromise;this.execPre(t,r,n,function(c){if(c){for(var l=o.numCallbackParams||0,f=o.contextParameter?[r]:[],h=f.length;h<l;++h)f.push(null);return i(a,c,t,r,f,o,s)}var p="function"==typeof s?n.length-1:n.length,y=e.length,d=e.apply(r,n.slice(0,p).concat(v));if(u){if(null!=d&&"function"==typeof d.then)return d.then(function(t){return v(null,t)},function(t){return v(t)});if(y<p+1)return v(null,d)}function v(){var e=Array.prototype.slice.call(arguments,1);if(o.nullResultByDefault&&0===e.length&&e.push(null),arguments[0])return i(a,arguments[0],t,r,e,o,s);a.execPost(t,r,e,function(){return arguments[0]?"function"==typeof s?s(arguments[0]):void 0:"function"==typeof s?s.apply(r,arguments):void 0})}})},n.prototype.filter=function(t){var e=this,r=this.clone(),n=Array.from(r._pres.keys()),i=!0,o=!1,s=void 0;try{for(var a,u=function(){var n=a.value,i=e._pres.get(n).map(function(t){return Object.assign({},t,{name:n})}).filter(t);if(0===i.length)return r._pres.delete(n),"continue";i.numAsync=i.filter(function(t){return t.isAsync}).length,r._pres.set(n,i)},c=n[Symbol.iterator]();!(i=(a=c.next()).done);i=!0)u()}catch(t){o=!0,s=t}finally{try{!i&&c.return&&c.return()}finally{if(o)throw s}}var l=Array.from(r._posts.keys()),f=!0,h=!1,p=void 0;try{for(var y,d=function(){var n=y.value,i=e._posts.get(n).map(function(t){return Object.assign({},t,{name:n})}).filter(t);if(0===i.length)return r._posts.delete(n),"continue";r._posts.set(n,i)},v=l[Symbol.iterator]();!(f=(y=v.next()).done);f=!0)d()}catch(t){h=!0,p=t}finally{try{!f&&v.return&&v.return()}finally{if(h)throw p}}return r},n.prototype.hasHooks=function(t){return this._pres.has(t)||this._posts.has(t)},n.prototype.createWrapper=function(t,r,n,i){var o=this;return this.hasHooks(t)?function(){var e=n||this,s=Array.prototype.slice.call(arguments);o.wrap(t,r,e,s,i)}:function(){var t=this,n=arguments;e.nextTick(function(){return r.apply(t,n)})}},n.prototype.pre=function(t,e,n,i,s){var a={};"object"===(void 0===e?"undefined":r(e))&&null!=e?e=(a=e).isAsync:"boolean"!=typeof arguments[1]&&(n,n=e,e=!1);var u=o(this._pres,t,[]);if(this._pres.set(t,u),e&&(u.numAsync=u.numAsync||0,++u.numAsync),"function"!=typeof n)throw new Error('pre() requires a function, got "'+(void 0===n?"undefined":r(n))+'"');return s?u.unshift(Object.assign({},a,{fn:n,isAsync:e})):u.push(Object.assign({},a,{fn:n,isAsync:e})),this},n.prototype.post=function(t,e,n,i){var s=o(this._posts,t,[]);if("function"==typeof e&&(i=!!n,n=e,e={}),"function"!=typeof n)throw new Error('post() requires a function, got "'+(void 0===n?"undefined":r(n))+'"');return i?s.unshift(Object.assign({},e,{fn:n})):s.push(Object.assign({},e,{fn:n})),this._posts.set(t,s),this},n.prototype.clone=function(){var t=new n,e=!0,r=!1,i=void 0;try{for(var o,s=this._pres.keys()[Symbol.iterator]();!(e=(o=s.next()).done);e=!0){var a=o.value,u=this._pres.get(a).slice();u.numAsync=this._pres.get(a).numAsync,t._pres.set(a,u)}}catch(t){r=!0,i=t}finally{try{!e&&s.return&&s.return()}finally{if(r)throw i}}var c=!0,l=!1,f=void 0;try{for(var h,p=this._posts.keys()[Symbol.iterator]();!(c=(h=p.next()).done);c=!0){var y=h.value;t._posts.set(y,this._posts.get(y).slice())}}catch(t){l=!0,f=t}finally{try{!c&&p.return&&p.return()}finally{if(l)throw f}}return t},n.prototype.merge=function(t,e){var r=(e=1===arguments.length||e)?this.clone():this,n=!0,i=!1,s=void 0;try{for(var a,u=function(){var e=a.value,n=o(r._pres,e,[]),i=t._pres.get(e).filter(function(t){return-1===n.map(function(t){return t.fn}).indexOf(t.fn)}),s=n.concat(i);s.numAsync=n.numAsync||0,s.numAsync+=i.filter(function(t){return t.isAsync}).length,r._pres.set(e,s)},c=t._pres.keys()[Symbol.iterator]();!(n=(a=c.next()).done);n=!0)u()}catch(t){i=!0,s=t}finally{try{!n&&c.return&&c.return()}finally{if(i)throw s}}var l=!0,f=!1,h=void 0;try{for(var p,y=function(){var e=p.value,n=o(r._posts,e,[]),i=t._posts.get(e).filter(function(t){return-1===n.indexOf(t)});r._posts.set(e,n.concat(i))},d=t._posts.keys()[Symbol.iterator]();!(l=(p=d.next()).done);l=!0)y()}catch(t){f=!0,h=t}finally{try{!l&&d.return&&d.return()}finally{if(f)throw h}}return r},t.exports=n}).call(this,r(8))},function(t,e,r){"use strict";var n=r(10),i=function t(e){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),Object.assign(this,e),null!=e&&null!=e.options&&(this.options=Object.assign({},e.options))};Object.defineProperty(i.prototype,"ref",n),Object.defineProperty(i.prototype,"refPath",n),Object.defineProperty(i.prototype,"localField",n),Object.defineProperty(i.prototype,"foreignField",n),Object.defineProperty(i.prototype,"justOne",n),Object.defineProperty(i.prototype,"count",n),Object.defineProperty(i.prototype,"match",n),Object.defineProperty(i.prototype,"options",n),Object.defineProperty(i.prototype,"skip",n),Object.defineProperty(i.prototype,"limit",n),Object.defineProperty(i.prototype,"perDocumentLimit",n),t.exports=i},function(t,e,r){"use strict";var n=r(138),i=r(74);
/*!
 * ignore
 */
function o(t,e,r){if(null!=e){var o=Object.keys(e),u=void 0,c=void 0,l=void 0,f=void 0,h=void 0;if(o.length&&o[0].startsWith("$")){if(e.$push)for(u in e.$push){var p=r.path(u);e.$push[u]&&p&&p.$isMongooseDocumentArray&&p.schema.options.timestamps&&(f=p.schema.options.timestamps,c=i(f,"createdAt"),l=i(f,"updatedAt"),e.$push[u].$each?e.$push[u].$each.forEach(function(e){null!=l&&(e[l]=t),null!=c&&(e[c]=t)}):(null!=l&&(e.$push[u][l]=t),null!=c&&(e.$push[u][c]=t)))}if(null!=e.$set){var y=Object.keys(e.$set),d=!0,v=!1,_=void 0;try{for(var m,g=y[Symbol.iterator]();!(d=(m=g.next()).done);d=!0){u=m.value;var b=n(u);if(h=r.path(b)){for(var w=[],O=b.split("."),S=O.length-1;S>0;--S){var E=r.path(O.slice(0,S).join("."));null!=E&&(E.$isMongooseDocumentArray||E.$isSingleNested)&&w.push({parentPath:u.split(".").slice(0,S).join("."),parentSchemaType:E})}if(Array.isArray(e.$set[u])&&h.$isMongooseDocumentArray)s(e.$set[u],h,t);else if(e.$set[u]&&h.$isSingleNested)a(e.$set[u],h,t);else if(w.length>0){var A=!0,j=!1,$=void 0;try{for(var x,P=w[Symbol.iterator]();!(A=(x=P.next()).done);A=!0){var N=x.value,T=N.parentPath,k=N.parentSchemaType;if(f=k.schema.options.timestamps,c=i(f,"createdAt"),l=i(f,"updatedAt"),f&&null!=l)if(k.$isSingleNested)e.$set[T+"."+l]=t;else if(k.$isMongooseDocumentArray){var B=u.substr(T.length+1);if(/^\d+$/.test(B)){e.$set[T+"."+B][l]=t;continue}var C=B.indexOf(".");B=-1!==C?B.substr(0,C):B,e.$set[T+"."+B+"."+l]=t}}}catch(t){j=!0,$=t}finally{try{!A&&P.return&&P.return()}finally{if(j)throw $}}}else if(null!=h.schema&&h.schema!=r&&e.$set[u]){if(f=h.schema.options.timestamps,c=i(f,"createdAt"),l=i(f,"updatedAt"),!f)continue;null!=l&&(e.$set[u][l]=t),null!=c&&(e.$set[u][c]=t)}}}}catch(t){v=!0,_=t}finally{try{!d&&g.return&&g.return()}finally{if(v)throw _}}}}else{var D=Object.keys(e).filter(function(t){return!t.startsWith("$")}),M=!0,R=!1,F=void 0;try{for(var I,L=D[Symbol.iterator]();!(M=(I=L.next()).done);M=!0){u=I.value;var U=n(u);(h=r.path(U))&&(Array.isArray(e[u])&&h.$isMongooseDocumentArray?s(e[u],h,t):null!=e[u]&&h.$isSingleNested&&a(e[u],h,t))}}catch(t){R=!0,F=t}finally{try{!M&&L.return&&L.return()}finally{if(R)throw F}}}}}function s(t,e,r){var n=e.schema.options.timestamps;if(n)for(var s=t.length,a=i(n,"createdAt"),u=i(n,"updatedAt"),c=0;c<s;++c)null!=u&&(t[c][u]=r),null!=a&&(t[c][a]=r),o(r,t[c],e.schema)}function a(t,e,r){var n=e.schema.options.timestamps;if(n){var s=i(n,"createdAt"),a=i(n,"updatedAt");null!=a&&(t[a]=r),null!=s&&(t[s]=r),o(r,t,e.schema)}}t.exports=o},function(t,e,r){"use strict";t.exports=function(t){return t.replace(/\.\$(\[[^\]]*\])?\./g,".0.").replace(/\.(\[[^\]]*\])?\$$/g,".0")}},function(t,e,r){"use strict";
/*!
 * ignore
 */var n=r(5);t.exports=
/*!
 * ignore
 */
function(t,e,r,i,o){var s=i,a=s,u=n(o,"overwrite",!1),c=n(o,"timestamps",!0);if(!c||null==s)return i;var l=null!=c&&!1===c.createdAt,f=null!=c&&!1===c.updatedAt;if(u)return i&&i.$set&&(i=i.$set,s.$set={},a=s.$set),f||!r||i[r]||(a[r]=t),l||!e||i[e]||(a[e]=t),s;if(i=i||{},Array.isArray(s))return s.push({$set:{updatedAt:t}}),s;if(s.$set=s.$set||{},!f&&r&&(!i.$currentDate||!i.$currentDate[r])){var h=!1;if(-1!==r.indexOf("."))for(var p=r.split("."),y=1;y<p.length;++y){var d=p.slice(-y).join("."),v=p.slice(0,-y).join(".");if(null!=i[v]){i[v][d]=t,h=!0;break}if(i.$set&&i.$set[v]){i.$set[v][d]=t,h=!0;break}}h||(s.$set[r]=t),s.hasOwnProperty(r)&&delete s[r]}if(!l&&e){i[e]&&delete i[e],i.$set&&i.$set[e]&&delete i.$set[e];var _=!1;if(-1!==e.indexOf("."))for(var m=e.split("."),g=1;g<m.length;++g){var b=m.slice(-g).join("."),w=m.slice(0,-g).join(".");if(null!=i[w]){i[w][b]=t,_=!0;break}if(i.$set&&i.$set[w]){i.$set[w][b]=t,_=!0;break}}_||(s.$setOnInsert=s.$setOnInsert||{},s.$setOnInsert[e]=t)}0===Object.keys(s.$set).length&&delete s.$set;return s}},function(t,e,r){"use strict";var n=r(5),i=r(20);
/*!
 * Gather all indexes defined in the schema, including single nested,
 * document arrays, and embedded discriminators.
 */
t.exports=function(t){var e=[],r=new WeakMap,o=t.constructor.indexTypes,s=new Map;return function t(a,u,c){if(r.has(a))return;r.set(a,!0);u=u||"";var l=Object.keys(a.paths);var f=!0;var h=!1;var p=void 0;try{for(var y,d=l[Symbol.iterator]();!(f=(y=d.next()).done);f=!0){var v=y.value,_=a.paths[v];if(null==c||!c.paths[v]){if(_.$isMongooseDocumentArray||_.$isSingleNested){if(!0!==n(_,"options.excludeIndexes")&&!0!==n(_,"schemaOptions.excludeIndexes")&&!0!==n(_,"schema.options.excludeIndexes")&&t(_.schema,u+v+"."),null!=_.schema.discriminators){var m=_.schema.discriminators,g=Object.keys(m),b=!0,w=!1,O=void 0;try{for(var S,E=g[Symbol.iterator]();!(b=(S=E.next()).done);b=!0){var A=S.value;t(m[A],u+v+".",_.schema)}}catch(t){w=!0,O=t}finally{try{!b&&E.return&&E.return()}finally{if(w)throw O}}}if(_.$isMongooseDocumentArray)continue}var j=_._index||_.caster&&_.caster._index;if(!1!==j&&null!==j&&void 0!==j){var $={},x=i(j),P=x?j:{},N="string"==typeof j?j:!!x&&j.type;if(N&&-1!==o.indexOf(N))$[u+v]=N;else if(P.text)$[u+v]="text",delete P.text;else{var T=-1===Number(j);$[u+v]=T?-1:1}delete P.type,"background"in P||(P.background=!0);var k=P&&P.name;"string"==typeof k&&s.has(k)?Object.assign(s.get(k),$):(e.push([$,P]),s.set(k,$))}}}}catch(t){h=!0,p=t}finally{try{!f&&d.return&&d.return()}finally{if(h)throw p}}r.delete(a);u?
/*!
   * Checks for indexes added to subdocs using Schema.index().
   * These indexes need their paths prefixed properly.
   *
   * schema._indexes = [ [indexObj, options], [indexObj, options] ..]
   */
function(t,r){for(var n=t._indexes,i=n.length,o=0;o<i;++o){for(var s=n[o][0],a=n[o][1],u=Object.keys(s),c=u.length,l={},f=0;f<c;++f){var h=u[f];l[r+h]=s[h]}var p=Object.assign({},a);if(null!=a&&null!=a.partialFilterExpression){p.partialFilterExpression={};var y=a.partialFilterExpression,d=!0,v=!1,_=void 0;try{for(var m,g=Object.keys(y)[Symbol.iterator]();!(d=(m=g.next()).done);d=!0){var b=m.value;p.partialFilterExpression[r+b]=y[b]}}catch(t){v=!0,_=t}finally{try{!d&&g.return&&g.return()}finally{if(v)throw _}}}e.push([l,p])}}(a,u):(a._indexes.forEach(function(t){"background"in t[1]||(t[1].background=!0)}),e=e.concat(a._indexes))}(t),e}},function(t,e,r){"use strict";t.exports=function(t,e){for(var r in t.add(e.tree||{}),t.callQueue=t.callQueue.concat(e.callQueue),t.method(e.methods),t.static(e.statics),e.query)t.query[r]=e.query[r];for(var n in e.virtuals)t.virtuals[n]=e.virtuals[n].clone();t.s.hooks.merge(e.s.hooks,!1)}},function(t,e,r){"use strict";var n=r(16),i=r(3);t.exports=function(t,e){if("string"==typeof t)return;if("function"==typeof t)return;throw new n('Invalid ref at path "'+e+'". Got '+i.inspect(t,{depth:0}))}},function(t,e,r){"use strict";
/*!
 * ignore
 */
/*!
 * Apply query middleware
 *
 * @param {Query} query constructor
 * @param {Model} model
 */
function n(t,e){var r={useErrorHandlers:!0,numCallbackParams:1,nullResultByDefault:!0},i=e.hooks.filter(function(t){var e=function(t){var e={};t.hasOwnProperty("query")&&(e.query=t.query);t.hasOwnProperty("document")&&(e.document=t.document);return e}(t);return"updateOne"===t.name?null==e.query||!!e.query:"deleteOne"===t.name?!!e.query||0===Object.keys(e).length:"validate"!==t.name&&"remove"!==t.name||!!e.query});t.prototype._execUpdate=i.createWrapper("update",t.prototype._execUpdate,null,r),t.prototype.__distinct=i.createWrapper("distinct",t.prototype.__distinct,null,r),t.prototype.validate=i.createWrapper("validate",t.prototype.validate,null,r),n.middlewareFunctions.filter(function(t){return"update"!==t&&"distinct"!==t&&"validate"!==t}).forEach(function(e){t.prototype["_"+e]=i.createWrapper(e,t.prototype["_"+e],null,r)})}t.exports=n,
/*!
 * ignore
 */
n.middlewareFunctions=["count","countDocuments","deleteMany","deleteOne","distinct","estimatedDocumentCount","find","findOne","findOneAndDelete","findOneAndRemove","findOneAndReplace","findOneAndUpdate","remove","replaceOne","update","updateMany","updateOne","validate"]},function(t,e,r){"use strict";(function(e){
/*!
 * Module dependencies.
 */
var n=r(7),i=r(4),o=r(145),s=r(76),a=r(2),u=r(0).populateModelSymbol,c=n.CastError,l=void 0;function f(t,e){this.enumValues=[],this.regExp=null,n.call(this,t,e,"String")}
/*!
 * ignore
 */
function h(t){return this.castForQuery(t)}f.schemaName="String",f.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
f.prototype=Object.create(n.prototype),f.prototype.constructor=f,Object.defineProperty(f.prototype,"OptionsConstructor",{configurable:!1,enumerable:!1,writable:!1,value:o}),
/*!
 * ignore
 */
f._cast=s,f.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){if(null!=t&&"string"!=typeof t)throw new Error;return t}),this._cast=t,this._cast)},f.get=n.get,f.set=n.set,
/*!
 * ignore
 */
f._checkRequired=function(t){return(t instanceof String||"string"==typeof t)&&t.length},f.checkRequired=n.checkRequired,f.prototype.enum=function(){if(this.enumValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.enumValidator},this),this.enumValidator=!1),void 0===arguments[0]||!1===arguments[0])return this;var t=void 0,e=void 0;a.isObject(arguments[0])?(t=arguments[0].values,e=arguments[0].message):(t=arguments,e=i.messages.String.enum);var r=!0,n=!1,o=void 0;try{for(var s,u=t[Symbol.iterator]();!(r=(s=u.next()).done);r=!0){var c=s.value;void 0!==c&&this.enumValues.push(this.cast(c))}}catch(t){n=!0,o=t}finally{try{!r&&u.return&&u.return()}finally{if(n)throw o}}var l=this.enumValues;return this.enumValidator=function(t){return void 0===t||~l.indexOf(t)},this.validators.push({validator:this.enumValidator,message:e,type:"enum",enumValues:l}),this},f.prototype.lowercase=function(t){return arguments.length>0&&!t?this:this.set(function(t,e){return"string"!=typeof t&&(t=e.cast(t)),t?t.toLowerCase():t})},f.prototype.uppercase=function(t){return arguments.length>0&&!t?this:this.set(function(t,e){return"string"!=typeof t&&(t=e.cast(t)),t?t.toUpperCase():t})},f.prototype.trim=function(t){return arguments.length>0&&!t?this:this.set(function(t,e){return"string"!=typeof t&&(t=e.cast(t)),t?t.trim():t})},f.prototype.minlength=function(t,e){if(this.minlengthValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.minlengthValidator},this)),null!==t&&void 0!==t){var r=e||i.messages.String.minlength;r=r.replace(/{MINLENGTH}/,t),this.validators.push({validator:this.minlengthValidator=function(e){return null===e||e.length>=t},message:r,type:"minlength",minlength:t})}return this},f.prototype.maxlength=function(t,e){if(this.maxlengthValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.maxlengthValidator},this)),null!==t&&void 0!==t){var r=e||i.messages.String.maxlength;r=r.replace(/{MAXLENGTH}/,t),this.validators.push({validator:this.maxlengthValidator=function(e){return null===e||e.length<=t},message:r,type:"maxlength",maxlength:t})}return this},f.prototype.match=function(t,e){var r=e||i.messages.String.match;return this.validators.push({validator:function(e){return!!t&&(null==e||""===e||t.test(e))},message:r,type:"regexp",regexp:t}),this},f.prototype.checkRequired=function(t,e){return n._isRef(this,t,e,!0)?!!t:("function"==typeof this.constructor.checkRequired?this.constructor.checkRequired():f.checkRequired())(t)},f.prototype.cast=function(t,i,o){if(n._isRef(this,t,i,o)){if(null===t||void 0===t)return t;if(l||(l=r(6)),t instanceof l)return t.$__.wasPopulated=!0,t;if("string"==typeof t)return t;if(e.isBuffer(t)||!a.isObject(t))throw new c("string",t,this.path,null,this);var s=i.$__fullPath(this.path),h=new((i.ownerDocument?i.ownerDocument():i).populated(s,!0).options[u])(t);return h.$__.wasPopulated=!0,h}var p="function"==typeof this.constructor.cast?this.constructor.cast():f.cast();try{return p(t)}catch(e){throw new c("string",t,this.path,null,this)}};var p=a.options(n.prototype.$conditionalHandlers,{$all:function(t){var e=this;return Array.isArray(t)?t.map(function(t){return e.castForQuery(t)}):[this.castForQuery(t)]},$gt:h,$gte:h,$lt:h,$lte:h,$options:String,$regex:h,$not:h});Object.defineProperty(f.prototype,"$conditionalHandlers",{configurable:!1,enumerable:!1,writable:!1,value:Object.freeze(p)}),f.prototype.castForQuery=function(t,e){var r=void 0;if(2===arguments.length){if(!(r=this.$conditionalHandlers[t]))throw new Error("Can't use "+t+" with String.");return r.call(this,e)}return e=t,"[object RegExp]"===Object.prototype.toString.call(e)?e:this._castForQuery(e)},
/*!
 * Module exports.
 */
t.exports=f}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"enum",o),Object.defineProperty(i.prototype,"match",o),Object.defineProperty(i.prototype,"lowercase",o),Object.defineProperty(i.prototype,"trim",o),Object.defineProperty(i.prototype,"uppercase",o),Object.defineProperty(i.prototype,"minlength",o),Object.defineProperty(i.prototype,"maxlength",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"min",o),Object.defineProperty(i.prototype,"max",o),Object.defineProperty(i.prototype,"enum",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";var n=r(21);
/*!
 * Given a value, cast it to a number, or throw a `CastError` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @param {String} [path] optional the path to set on the CastError
 * @return {Boolean|null|undefined}
 * @throws {Error} if `value` is not one of the allowed values
 * @api private
 */t.exports=function(t){return null==t?t:""===t?null:("string"!=typeof t&&"boolean"!=typeof t||(t=Number(t)),n.ok(!isNaN(t)),t instanceof Number?t.valueOf():"number"==typeof t?t:Array.isArray(t)||"function"!=typeof t.valueOf?t.toString&&!Array.isArray(t)&&t.toString()==Number(t)?Number(t):void n.ok(!1):Number(t.valueOf()))}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(12),i=r(7),o=r(49),s=r(2);function a(t,e){i.call(this,t,e,"Boolean")}a.schemaName="Boolean",a.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
a.prototype=Object.create(i.prototype),a.prototype.constructor=a,
/*!
 * ignore
 */
a._cast=o,a.set=i.set,a.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){if(null!=t&&"boolean"!=typeof t)throw new Error;return t}),this._cast=t,this._cast)},
/*!
 * ignore
 */
a._checkRequired=function(t){return!0===t||!1===t},a.checkRequired=i.checkRequired,a.prototype.checkRequired=function(t){return this.constructor._checkRequired(t)},Object.defineProperty(a,"convertToTrue",{get:function(){return o.convertToTrue},set:function(t){o.convertToTrue=t}}),Object.defineProperty(a,"convertToFalse",{get:function(){return o.convertToFalse},set:function(t){o.convertToFalse=t}}),a.prototype.cast=function(t){var e="function"==typeof this.constructor.cast?this.constructor.cast():a.cast();try{return e(t)}catch(e){throw new n("Boolean",t,this.path,e,this)}},a.$conditionalHandlers=s.options(i.prototype.$conditionalHandlers,{}),a.prototype.castForQuery=function(t,e){var r=void 0;return 2===arguments.length?(r=a.$conditionalHandlers[t])?r.call(this,e):this._castForQuery(e):this._castForQuery(t)},
/*!
 * Module exports.
 */
t.exports=a},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(55),i=r(12),o=r(18).EventEmitter,s=r(154),a=r(7),u=r(29),c=r(89),l=r(5),f=r(90),h=r(3),p=r(2),y=r(91),d=r(0).arrayPathSymbol,v=r(0).documentArrayParent,_=void 0,m=void 0;function g(t,e,r,i){null!=i&&null!=i._id?e=f(e,i):null!=r&&null!=r._id&&(e=f(e,r));var o=b(e,r);o.prototype.$basePath=t,n.call(this,t,o,r),this.schema=e,this.schemaOptions=i||{},this.$isMongooseDocumentArray=!0,this.Constructor=o,o.base=e.base;var s=this.defaultValue;"defaultValue"in this&&void 0===s||this.default(function(){var t=s.call(this);return Array.isArray(t)||(t=[t]),t});var u=this;this.$embeddedSchemaType=new a(t+".$",{required:l(this,"schemaOptions.required",!1)}),this.$embeddedSchemaType.cast=function(t,e,r){return u.cast(t,e,r)[0]},this.$embeddedSchemaType.$isMongooseDocumentArrayElement=!0,this.$embeddedSchemaType.caster=this.Constructor,this.$embeddedSchemaType.schema=this.schema}
/*!
 * Ignore
 */
function b(t,e,n){function i(){m.apply(this,arguments),this.$session(this.ownerDocument().$session())}m||(m=r(25));var s=null!=n?n.prototype:m.prototype;for(var a in i.prototype=Object.create(s),i.prototype.$__setSchema(t),i.schema=t,i.prototype.constructor=i,i.$isArraySubdocument=!0,i.events=new o,t.methods)i.prototype[a]=t.methods[a];for(var u in t.statics)i[u]=t.statics[u];for(var c in o.prototype)i[c]=o.prototype[c];return i.options=e,i}
/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArrayPath} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */
function w(t,e,r){if(r&&e){for(var n=t.path+".",i=Object.keys(e),o=i.length,s={},a=void 0,u=void 0,c=void 0;o--;)if((u=i[o]).startsWith(n)){if("$"===(c=u.substring(n.length)))continue;c.startsWith("$.")&&(c=c.substr(2)),a||(a=!0),s[c]=e[u]}return a&&s||void 0}}
/*!
 * Module exports.
 */g.schemaName="DocumentArray",g.options={castNonArrays:!0},
/*!
 * Inherits from ArrayType.
 */
g.prototype=Object.create(n.prototype),g.prototype.constructor=g,g.prototype.OptionsConstructor=s,g.prototype.discriminator=function(t,e,r){"function"==typeof t&&(t=p.getFunctionName(t));var n=b(e=c(this.casterConstructor,t,e,r),null,this.casterConstructor);n.baseCasterConstructor=this.casterConstructor;try{Object.defineProperty(n,"name",{value:t})}catch(t){}return this.casterConstructor.discriminators[t]=n,this.casterConstructor.discriminators[t]},g.prototype.doValidate=function(t,e,n,i){_||(_=r(17));var o=this;try{a.prototype.doValidate.call(this,t,function(r){if(r)return r.$isArrayValidatorError=!0,e(r);var s=t&&t.length,a=void 0;if(!s)return e();if(i&&i.updateValidator)return e();t.isMongooseDocumentArray||(t=new _(t,o.path,n));function c(t){null!=t&&((a=t)instanceof u||(a.$isArrayValidatorError=!0)),--s||e(a)}for(var l=0,f=s;l<f;++l){var h=t[l];if(null!=h){if(!(h instanceof m)){var p=y(o.casterConstructor,t[l]);h=t[l]=new p(h,t,void 0,void 0,l)}h.$__validate(c)}else--s||e(a)}},n)}catch(t){return t.$isArrayValidatorError=!0,e(t)}},g.prototype.doValidateSync=function(t,e){var r=a.prototype.doValidateSync.call(this,t,e);if(null!=r)return r.$isArrayValidatorError=!0,r;var n=t&&t.length,i=null;if(n){for(var o=0,s=n;o<s;++o){var u=t[o];if(u){if(!(u instanceof m)){var c=y(this.casterConstructor,t[o]);u=t[o]=new c(u,t,void 0,void 0,o)}var l=u.validateSync();l&&null==i&&(i=l)}}return i}},
/*!
 * ignore
 */
g.prototype.getDefault=function(t){var e="function"==typeof this.defaultValue?this.defaultValue.call(t):this.defaultValue;if(null==e)return e;_||(_=r(17)),Array.isArray(e)||(e=[e]),e=new _(e,this.path,t);for(var n=0;n<e.length;++n){var i=new(y(this.casterConstructor,e[n]))({},e,void 0,void 0,n);i.init(e[n]),i.isNew=!0,Object.assign(i.$__.activePaths.default,i.$__.activePaths.init),i.$__.activePaths.init={},e[n]=i}return e},g.prototype.cast=function(t,e,n,o,s){_||(_=r(17));var a=void 0,u=void 0,c={transform:!1,virtuals:!1};if(s=s||{},!Array.isArray(t)){if(!n&&!g.options.castNonArrays)throw new i("DocumentArray",h.inspect(t),this.path,null,this);return e&&n&&e.markModified(this.path),this.cast([t],e,n,o,s)}t&&t.isMongooseDocumentArray||s.skipDocumentArrayCast?t&&t.isMongooseDocumentArray&&(t=new _(t,this.path,e)):t=new _(t,this.path,e),null!=s.arrayPath&&(t[d]=s.arrayPath);for(var l=t.length,f=0;f<l;++f)if(t[f]){var b=y(this.casterConstructor,t[f]);if(!t[f].$__||t[f]instanceof b&&t[f][v]===e||(t[f]=t[f].toObject({transform:!1,virtuals:t[f].schema===b.schema})),t[f]instanceof m)null==t[f].__index&&t[f].$setIndex(f);else if(null!=t[f])if(n)e?a||(a=w(this,e.$__.selected,n)):a=!0,u=new b(null,t,!0,a,f),t[f]=u.init(t[f]);else if(o&&"function"==typeof o.id&&(u=o.id(t[f]._id)),o&&u&&p.deepEqual(u.toObject(c),t[f]))u.set(t[f]),t[f]=u;else try{u=new b(t[f],t,void 0,void 0,f),t[f]=u}catch(e){var O=h.inspect(t[f]);throw new i("embedded",O,t[d],e,this)}}return t},
/*!
 * ignore
 */
g.prototype.clone=function(){var t=Object.assign({},this.options),e=new this.constructor(this.path,this.schema,t,this.schemaOptions);return e.validators=this.validators.slice(),void 0!==this.requiredValidator&&(e.requiredValidator=this.requiredValidator),e.Constructor.discriminators=Object.assign({},this.Constructor.discriminators),e},t.exports=g},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"enum",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";t.exports=function t(e){if(!Array.isArray(e))return{min:0,max:0};if(0===e.length)return{min:1,max:1};var r=t(e[0]);for(var n=1;n<e.length;++n){var i=t(e[n]);i.min<r.min&&(r.min=i.min),i.max>r.max&&(r.max=i.max)}r.min=r.min+1;r.max=r.max+1;return r}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(12),o=r(30),s=r(54),a=r(153),u=r(5),c=r(79),l=r(3),f=r(20),h=r(27),p=["Polygon","MultiPolygon"];function y(t,e,r){if(Array.isArray(t))t.forEach(function(n,i){if(Array.isArray(n)||f(n))return y(n,e,r);t[i]=e.castForQueryWrapper({val:n,context:r})});else for(var n=Object.keys(t),i=n.length;i--;){var o=n[i],s=t[o];Array.isArray(s)||f(s)?(y(s,e,r),t[o]=s):t[o]=e.castForQuery({val:s,context:r})}}t.exports=function t(e,r,d,v){if(Array.isArray(r))throw new Error("Query filter must be an object, got an array ",l.inspect(r));if(null==r)return r;r.hasOwnProperty("_bsontype")&&"ObjectID"!==r._bsontype&&delete r._bsontype;var _=Object.keys(r),m=_.length,g=void 0,b=void 0,w=void 0,O=void 0,S=void 0,E=void 0;for(d=d||{};m--;)if(E=r[O=_[m]],"$or"===O||"$nor"===O||"$and"===O){if(!Array.isArray(E))throw new i("Array",E,O);for(var A=0;A<E.length;++A){if(null==E[A]||"object"!==n(E[A]))throw new i("Object",E[A],O+"."+A);E[A]=t(e,E[A],d,v)}}else{if("$where"===O){if("string"!==(S=void 0===E?"undefined":n(E))&&"function"!==S)throw new Error("Must have a string or function for $where");"function"===S&&(r[O]=E.toString());continue}if("$elemMatch"===O)E=t(e,E,d,v);else if("$text"===O)E=a(E,O);else{if(!e)continue;if(!(b=e.path(O)))for(var j=O.split("."),$=j.length;$--;){var x=j.slice(0,$).join("."),P=j.slice($).join("."),N=e.path(x),T=u(N,"schema.options.discriminatorKey");if(null!=N&&null!=u(N,"schema.discriminators")&&null!=T&&P!==T){var k=u(r,x+"."+T);null!=k&&(b=N.schema.discriminators[k].path(P))}}if(b){if(null==E)continue;if("Object"===E.constructor.name)if(Object.keys(E).some(c))for(var B=Object.keys(E),C=void 0,D=B.length;D--;)if(w=E[C=B[D]],"$not"===C){if(w&&b&&!b.caster){if((g=Object.keys(w)).length&&c(g[0]))for(var M in w)w[M]=b.castForQueryWrapper({$conditional:M,val:w[M],context:v});else E[C]=b.castForQueryWrapper({$conditional:C,val:w,context:v});continue}t(b.caster?b.caster.schema:e,w,d,v)}else E[C]=b.castForQueryWrapper({$conditional:C,val:w,context:v});else r[O]=b.castForQueryWrapper({val:E,context:v});else if(Array.isArray(E)&&-1===["Buffer","Array"].indexOf(b.instance)){var R=[],F=E,I=!0,L=!1,U=void 0;try{for(var V,q=F[Symbol.iterator]();!(I=(V=q.next()).done);I=!0){var W=V.value;R.push(b.castForQueryWrapper({val:W,context:v}))}}catch(t){L=!0,U=t}finally{try{!I&&q.return&&q.return()}finally{if(L)throw U}}r[O]={$in:R}}else r[O]=b.castForQueryWrapper({val:E,context:v})}else{for(var H=O.split("."),Y=H.length,z=void 0,K=void 0,Q=void 0;Y--&&(z=H.slice(0,Y).join("."),!(b=e.path(z))););if(b){b.caster&&b.caster.schema?((Q={})[K=H.slice(Y).join(".")]=E,r[O]=t(b.caster.schema,Q,d,v)[K]):r[O]=E;continue}if(f(E)){var J="";if(E.$near?J="$near":E.$nearSphere?J="$nearSphere":E.$within?J="$within":E.$geoIntersects?J="$geoIntersects":E.$geoWithin&&(J="$geoWithin"),J){var G=new s.Number("__QueryCasting__"),X=E[J];if(null!=E.$maxDistance&&(E.$maxDistance=G.castForQueryWrapper({val:E.$maxDistance,context:v})),null!=E.$minDistance&&(E.$minDistance=G.castForQueryWrapper({val:E.$minDistance,context:v})),"$within"===J){var Z=X.$center||X.$centerSphere||X.$box||X.$polygon;if(!Z)throw new Error("Bad $within parameter: "+JSON.stringify(E));X=Z}else if("$near"===J&&"string"==typeof X.type&&Array.isArray(X.coordinates))X=X.coordinates;else if(("$near"===J||"$nearSphere"===J||"$geoIntersects"===J)&&X.$geometry&&"string"==typeof X.$geometry.type&&Array.isArray(X.$geometry.coordinates))null!=X.$maxDistance&&(X.$maxDistance=G.castForQueryWrapper({val:X.$maxDistance,context:v})),null!=X.$minDistance&&(X.$minDistance=G.castForQueryWrapper({val:X.$minDistance,context:v})),h(X.$geometry)&&(X.$geometry=X.$geometry.toObject({transform:!1,virtuals:!1})),X=X.$geometry.coordinates;else if("$geoWithin"===J)if(X.$geometry){h(X.$geometry)&&(X.$geometry=X.$geometry.toObject({virtuals:!1}));var tt=X.$geometry.type;if(-1===p.indexOf(tt))throw new Error('Invalid geoJSON type for $geoWithin "'+tt+'", must be "Polygon" or "MultiPolygon"');X=X.$geometry.coordinates}else X=X.$box||X.$polygon||X.$center||X.$centerSphere,h(X)&&(X=X.toObject({virtuals:!1}));y(X,G,v);continue}}if(e.nested[O])continue;if(d.upsert&&d.strict){if("throw"===d.strict)throw new o(O);throw new o(O,'Path "'+O+'" is not in schema, strict mode is `true`, and upsert is `true`.')}if("throw"===d.strictQuery)throw new o(O,'Path "'+O+"\" is not in schema and strictQuery is 'throw'.");d.strictQuery&&delete r[O]}}}return r}},function(t,e,r){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(12),o=r(49),s=r(76);
/*!
 * Casts val to an object suitable for `$text`. Throws an error if the object
 * can't be casted.
 *
 * @param {Any} val value to cast
 * @param {String} [path] path to associate with any errors that occured
 * @return {Object} casted object
 * @see https://docs.mongodb.com/manual/reference/operator/query/text/
 * @api private
 */
t.exports=function(t,e){if(null==t||"object"!==(void 0===t?"undefined":n(t)))throw new i("$text",t,e);return null!=t.$search&&(t.$search=s(t.$search,e+".$search")),null!=t.$language&&(t.$language=s(t.$language,e+".$language")),null!=t.$caseSensitive&&(t.$caseSensitive=o(t.$caseSensitive,e+".$castSensitive")),null!=t.$diacriticSensitive&&(t.$diacriticSensitive=o(t.$diacriticSensitive,e+".$diacriticSensitive")),t}},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"excludeIndexes",o),Object.defineProperty(i.prototype,"_id",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(12),o=r(18).EventEmitter,s=r(72),a=r(156),u=r(7),c=r(48),l=r(32).castToNumber,f=r(89),h=r(80),p=r(5),y=r(91),d=r(90),v=r(22).internalToObjectOptions,_=void 0;function m(t,e,r){t=d(t,r),this.caster=g(t),this.caster.path=e,this.caster.prototype.$basePath=e,this.schema=t,this.$isSingleNested=!0,u.call(this,e,r,"Embedded")}
/*!
 * ignore
 */
/*!
 * ignore
 */
function g(t,e){_||(_=r(88));var n=function(t,e,r){var n=this;this.$parent=r,_.apply(this,arguments),this.$session(this.ownerDocument().$session()),r&&(r.on("save",function(){n.emit("save",n),n.constructor.emit("save",n)}),r.on("isNew",function(t){n.isNew=t,n.emit("isNew",t),n.constructor.emit("isNew",t)}))},i=null!=e?e.prototype:_.prototype;for(var s in(n.prototype=Object.create(i)).$__setSchema(t),n.prototype.constructor=n,n.schema=t,n.$isSingleNested=!0,n.events=new o,n.prototype.toBSON=function(){return this.toObject(v)},t.methods)n.prototype[s]=t.methods[s];for(var a in t.statics)n[a]=t.statics[a];for(var u in o.prototype)n[u]=o.prototype[u];return n}
/*!
 * Special case for when users use a common location schema to represent
 * locations for use with $geoWithin.
 * https://docs.mongodb.org/manual/reference/operator/query/geoWithin/
 *
 * @param {Object} val
 * @api private
 */t.exports=m,m.prototype=Object.create(u.prototype),m.prototype.constructor=m,m.prototype.OptionsConstructor=a,m.prototype.$conditionalHandlers.$geoWithin=function(t){return{$geometry:this.castForQuery(t.$geometry)}},
/*!
 * ignore
 */
m.prototype.$conditionalHandlers.$near=m.prototype.$conditionalHandlers.$nearSphere=h.cast$near,m.prototype.$conditionalHandlers.$within=m.prototype.$conditionalHandlers.$geoWithin=h.cast$within,m.prototype.$conditionalHandlers.$geoIntersects=h.cast$geoIntersects,m.prototype.$conditionalHandlers.$minDistance=l,m.prototype.$conditionalHandlers.$maxDistance=l,m.prototype.$conditionalHandlers.$exists=c,m.prototype.cast=function(t,e,r,i){if(t&&t.$isSingleNested&&t.parent===e)return t;if(null!=t&&("object"!==(void 0===t?"undefined":n(t))||Array.isArray(t)))throw new s(this.path,t);var o=y(this.caster,t),a=void 0,u=p(e,"$__.selected",{}),c=this.path,l=Object.keys(u).reduce(function(t,e){return e.startsWith(c+".")&&(t[e.substr(c.length+1)]=u[e]),t},{});return r?((a=new o(void 0,l,e)).init(t),a):0===Object.keys(t).length?new o({},l,e):new o(t,l,e,void 0,{priorDoc:i})},m.prototype.castForQuery=function(t,e,r){var n=void 0;if(2===arguments.length){if(!(n=this.$conditionalHandlers[t]))throw new Error("Can't use "+t);return n.call(this,e)}if(null==(e=t))return e;this.options.runSetters&&(e=this._applySetters(e));var o=y(this.caster,e),s=null!=r&&null!=r.strict?r.strict:void 0;try{e=new o(e,s)}catch(t){if(!(t instanceof i))throw new i("Embedded",e,this.path,t,this);throw t}return e},m.prototype.doValidate=function(t,e,r,n){var i=y(this.caster,t);if(n&&n.skipSchemaValidators)return t instanceof i||(t=new i(t,null,r)),t.validate(e);u.prototype.doValidate.call(this,t,function(r){return r?e(r):t?void t.validate(e):e(null)},r,n)},m.prototype.doValidateSync=function(t,e,r){if(!r||!r.skipSchemaValidators){var n=u.prototype.doValidateSync.call(this,t,e);if(n)return n}if(t)return t.validateSync()},m.prototype.discriminator=function(t,e,r){return e=f(this.caster,t,e,r),this.caster.discriminators[t]=g(e,this.caster),this.caster.discriminators[t]},
/*!
 * ignore
 */
m.prototype.clone=function(){var t=Object.assign({},this.options),e=new this.constructor(this.schema,this.path,t);return e.validators=this.validators.slice(),void 0!==this.requiredValidator&&(e.requiredValidator=this.requiredValidator),e.caster.discriminators=Object.assign({},this.caster.discriminators),e}},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"_id",o),t.exports=i},function(t,e,r){"use strict";(function(e){
/*!
 * Module dependencies.
 */
var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(84),o=r(158),s=r(7),a=r(78),u=r(2),c=r(0).populateModelSymbol,l=i.Binary,f=s.CastError,h=void 0;function p(t,e){s.call(this,t,e,"Buffer")}
/*!
 * ignore
 */
function y(t){return this.castForQuery(t)}p.schemaName="Buffer",p.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
p.prototype=Object.create(s.prototype),p.prototype.constructor=p,p.prototype.OptionsConstructor=o,
/*!
 * ignore
 */
p._checkRequired=function(t){return!(!t||!t.length)},p.set=s.set,p.checkRequired=s.checkRequired,p.prototype.checkRequired=function(t,e){return s._isRef(this,t,e,!0)?!!t:this.constructor._checkRequired(t)},p.prototype.cast=function(t,o,a){var p=void 0;if(s._isRef(this,t,o,a)){if(null===t||void 0===t)return t;if(h||(h=r(6)),t instanceof h)return t.$__.wasPopulated=!0,t;if(e.isBuffer(t))return t;if(!u.isObject(t))throw new f("Buffer",t,this.path,null,this);var y=o.$__fullPath(this.path);return(p=new((o.ownerDocument?o.ownerDocument():o).populated(y,!0).options[c])(t)).$__.wasPopulated=!0,p}if(t&&t._id&&(t=t._id),t&&t.isMongooseBuffer)return t;if(e.isBuffer(t))return t&&t.isMongooseBuffer||(t=new i(t,[this.path,o]),null!=this.options.subtype&&(t._subtype=this.options.subtype)),t;if(t instanceof l){if(p=new i(t.value(!0),[this.path,o]),"number"!=typeof t.sub_type)throw new f("Buffer",t,this.path,null,this);return p._subtype=t.sub_type,p}if(null===t)return t;var d=void 0===t?"undefined":n(t);if("string"===d||"number"===d||Array.isArray(t)||"object"===d&&"Buffer"===t.type&&Array.isArray(t.data))return"number"===d&&(t=[t]),p=new i(t,[this.path,o]),null!=this.options.subtype&&(p._subtype=this.options.subtype),p;throw new f("Buffer",t,this.path,null,this)},p.prototype.subtype=function(t){return this.options.subtype=t,this},p.prototype.$conditionalHandlers=u.options(s.prototype.$conditionalHandlers,{$bitsAllClear:a,$bitsAnyClear:a,$bitsAllSet:a,$bitsAnySet:a,$gt:y,$gte:y,$lt:y,$lte:y}),p.prototype.castForQuery=function(t,e){var r=void 0;if(2===arguments.length){if(!(r=this.$conditionalHandlers[t]))throw new Error("Can't use "+t+" with Buffer.");return r.call(this,e)}e=t;var n=this._castForQuery(e);return n?n.toObject({transform:!1,virtuals:!1}):n},
/*!
 * Module exports.
 */
t.exports=p}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"subtype",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";
/*!
 * Module requirements.
 */var n=r(4),i=r(160),o=r(7),s=r(161),a=r(2),u=o.CastError;function c(t,e){o.call(this,t,e,"Date")}
/*!
 * Date Query casting.
 *
 * @api private
 */
function l(t){return this.cast(t)}c.schemaName="Date",c.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
c.prototype=Object.create(o.prototype),c.prototype.constructor=c,c.prototype.OptionsConstructor=i,
/*!
 * ignore
 */
c._cast=s,c.set=o.set,c.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){if(null!=t&&!(t instanceof Date))throw new Error;return t}),this._cast=t,this._cast)},c.prototype.expires=function(t){return this._index&&"Object"===this._index.constructor.name||(this._index={}),this._index.expires=t,a.expires(this._index),this},
/*!
 * ignore
 */
c._checkRequired=function(t){return t instanceof Date},c.checkRequired=o.checkRequired,c.prototype.checkRequired=function(t,e){return o._isRef(this,t,e,!0)?!!t:("function"==typeof this.constructor.checkRequired?this.constructor.checkRequired():c.checkRequired())(t)},c.prototype.min=function(t,e){if(this.minValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.minValidator},this)),t){var r=e||n.messages.Date.min;"string"==typeof r&&(r=r.replace(/{MIN}/,t===Date.now?"Date.now()":t.toString()));var i=this;this.validators.push({validator:this.minValidator=function(e){var r=t;"function"==typeof t&&t!==Date.now&&(r=r.call(this));var n=r===Date.now?r():i.cast(r);return null===e||e.valueOf()>=n.valueOf()},message:r,type:"min",min:t})}return this},c.prototype.max=function(t,e){if(this.maxValidator&&(this.validators=this.validators.filter(function(t){return t.validator!==this.maxValidator},this)),t){var r=e||n.messages.Date.max;"string"==typeof r&&(r=r.replace(/{MAX}/,t===Date.now?"Date.now()":t.toString()));var i=this;this.validators.push({validator:this.maxValidator=function(e){var r=t;"function"==typeof r&&r!==Date.now&&(r=r.call(this));var n=r===Date.now?r():i.cast(r);return null===e||e.valueOf()<=n.valueOf()},message:r,type:"max",max:t})}return this},c.prototype.cast=function(t){var e="function"==typeof this.constructor.cast?this.constructor.cast():c.cast();try{return e(t)}catch(e){throw new u("date",t,this.path,e,this)}},c.prototype.$conditionalHandlers=a.options(o.prototype.$conditionalHandlers,{$gt:l,$gte:l,$lt:l,$lte:l}),c.prototype.castForQuery=function(t,e){if(2!==arguments.length)return this._castForQuery(t);var r=this.$conditionalHandlers[t];if(!r)throw new Error("Can't use "+t+" with Date.");return r.call(this,e)},
/*!
 * Module exports.
 */
t.exports=c},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"min",o),Object.defineProperty(i.prototype,"max",o),Object.defineProperty(i.prototype,"expires",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";var n=r(21);t.exports=function(t){if(null==t||""===t)return null;if(t instanceof Date)return n.ok(!isNaN(t.valueOf())),t;var e=void 0;if(n.ok("boolean"!=typeof t),e=t instanceof Number||"number"==typeof t?new Date(t):"string"==typeof t&&!isNaN(Number(t))&&(Number(t)>=275761||Number(t)<-271820)?new Date(Number(t)):"function"==typeof t.valueOf?new Date(t.valueOf()):new Date(t),!isNaN(e.valueOf()))return e;n.ok(!1)}},function(t,e,r){"use strict";(function(e){
/*!
 * Module dependencies.
 */
var n=r(163),i=r(7),o=r(85),s=r(13),a=r(2),u=r(0).populateModelSymbol,c=i.CastError,l=void 0;function f(t,e){var r="string"==typeof t&&24===t.length&&/^[a-f0-9]+$/i.test(t),n=e&&e.suppressWarning;!r&&void 0!==t||n||(console.warn("mongoose: To create a new ObjectId please try `Mongoose.Types.ObjectId` instead of using `Mongoose.Schema.ObjectId`. Set the `suppressWarning` option if you're trying to create a hex char path in your schema."),console.trace()),i.call(this,t,e,"ObjectID")}
/*!
 * ignore
 */
function h(t){return this.cast(t)}
/*!
 * ignore
 */
function p(){return new s}function y(t){if(l||(l=r(6)),this instanceof l){if(void 0===t){var e=new s;return this.$__._id=e,e}this.$__._id=t}return t}
/*!
 * Module exports.
 */f.schemaName="ObjectId",f.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
f.prototype=Object.create(i.prototype),f.prototype.constructor=f,f.prototype.OptionsConstructor=n,f.get=i.get,f.set=i.set,f.prototype.auto=function(t){return t&&(this.default(p),this.set(y)),this},
/*!
 * ignore
 */
f._checkRequired=function(t){return t instanceof s},
/*!
 * ignore
 */
f._cast=o,f.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){if(!(t instanceof s))throw new Error(t+" is not an instance of ObjectId");return t}),this._cast=t,this._cast)},f.checkRequired=i.checkRequired,f.prototype.checkRequired=function(t,e){return i._isRef(this,t,e,!0)?!!t:("function"==typeof this.constructor.checkRequired?this.constructor.checkRequired():f.checkRequired())(t)},f.prototype.cast=function(t,n,o){if(i._isRef(this,t,n,o)){if(null===t||void 0===t)return t;if(l||(l=r(6)),t instanceof l)return t.$__.wasPopulated=!0,t;if(t instanceof s)return t;if("objectid"===(t.constructor.name||"").toLowerCase())return new s(t.toHexString());if(e.isBuffer(t)||!a.isObject(t))throw new c("ObjectId",t,this.path,null,this);var h=n.$__fullPath(this.path),p=(n.ownerDocument?n.ownerDocument():n).populated(h,!0),y=t;return n.$__.populated&&n.$__.populated[h]&&n.$__.populated[h].options&&n.$__.populated[h].options.options&&n.$__.populated[h].options.options.lean||((y=new p.options[u](t)).$__.wasPopulated=!0),y}var d="function"==typeof this.constructor.cast?this.constructor.cast():f.cast();try{return d(t)}catch(e){throw new c("ObjectId",t,this.path,e,this)}},f.prototype.$conditionalHandlers=a.options(i.prototype.$conditionalHandlers,{$gt:h,$gte:h,$lt:h,$lte:h}),p.$runBeforeSetters=!0,t.exports=f}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"auto",o),
/*!
 * ignore
 */
t.exports=i},function(t,e,r){"use strict";(function(e){
/*!
 * Module dependencies.
 */
var n=r(7),i=n.CastError,o=r(19),s=r(165),a=r(2),u=r(0).populateModelSymbol,c=void 0;function l(t,e){n.call(this,t,e,"Decimal128")}
/*!
 * ignore
 */
function f(t){return this.cast(t)}l.schemaName="Decimal128",l.defaultOptions={},
/*!
 * Inherits from SchemaType.
 */
l.prototype=Object.create(n.prototype),l.prototype.constructor=l,
/*!
 * ignore
 */
l._cast=s,l.set=n.set,l.cast=function(t){return 0===arguments.length?this._cast:(!1===t&&(t=function(t){if(null!=t&&!(t instanceof o))throw new Error;return t}),this._cast=t,this._cast)},
/*!
 * ignore
 */
l._checkRequired=function(t){return t instanceof o},l.checkRequired=n.checkRequired,l.prototype.checkRequired=function(t,e){return n._isRef(this,t,e,!0)?!!t:("function"==typeof this.constructor.checkRequired?this.constructor.checkRequired():l.checkRequired())(t)},l.prototype.cast=function(t,s,f){if(n._isRef(this,t,s,f)){if(null===t||void 0===t)return t;if(c||(c=r(6)),t instanceof c)return t.$__.wasPopulated=!0,t;if(t instanceof o)return t;if(e.isBuffer(t)||!a.isObject(t))throw new i("Decimal128",t,this.path,null,this);var h=s.$__fullPath(this.path),p=(s.ownerDocument?s.ownerDocument():s).populated(h,!0),y=t;return s.$__.populated&&s.$__.populated[h]&&s.$__.populated[h].options&&s.$__.populated[h].options.options&&s.$__.populated[h].options.options.lean||((y=new p.options[u](t)).$__.wasPopulated=!0),y}var d="function"==typeof this.constructor.cast?this.constructor.cast():l.cast();try{return d(t)}catch(e){throw new i("Decimal128",t,this.path,e,this)}},l.prototype.$conditionalHandlers=a.options(n.prototype.$conditionalHandlers,{$gt:f,$gte:f,$lt:f,$lte:f}),
/*!
 * Module exports.
 */
t.exports=l}).call(this,r(1).Buffer)},function(t,e,r){"use strict";(function(e){var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(19),o=r(21);t.exports=function(t){return null==t?t:"object"===(void 0===t?"undefined":n(t))&&"string"==typeof t.$numberDecimal?i.fromString(t.$numberDecimal):t instanceof i?t:"string"==typeof t?i.fromString(t):e.isBuffer(t)?new i(t):"number"==typeof t?i.fromString(String(t)):"function"==typeof t.valueOf&&"string"==typeof t.valueOf()?i.fromString(t.valueOf()):void o.ok(!1)}}).call(this,r(1).Buffer)},function(t,e,r){"use strict";(function(e){
/*!
 * ignore
 */
var n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}();var i=r(86),o=r(167),s=r(7),a=function(t){function r(t,e){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,r);var n=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(r.__proto__||Object.getPrototypeOf(r)).call(this,t,e,"Map"));return n.$isSchemaMap=!0,n}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(r,s),n(r,[{key:"set",value:function(t,e){return s.set(t,e)}},{key:"cast",value:function(t,r,n){if(t instanceof i)return t;if(n){var o=new i({},this.path,r,this.$__schemaType);if(t instanceof e.Map){var s=!0,a=!1,u=void 0;try{for(var c,l=t.keys()[Symbol.iterator]();!(s=(c=l.next()).done);s=!0){var f=c.value;o.$init(f,o.$__schemaType.cast(t.get(f),r,!0))}}catch(t){a=!0,u=t}finally{try{!s&&l.return&&l.return()}finally{if(a)throw u}}}else{var h=!0,p=!1,y=void 0;try{for(var d,v=Object.keys(t)[Symbol.iterator]();!(h=(d=v.next()).done);h=!0){var _=d.value;o.$init(_,o.$__schemaType.cast(t[_],r,!0))}}catch(t){p=!0,y=t}finally{try{!h&&v.return&&v.return()}finally{if(p)throw y}}}return o}return new i(t,this.path,r,this.$__schemaType)}},{key:"clone",value:function(){var t=function t(e,r,n){null===e&&(e=Function.prototype);var i=Object.getOwnPropertyDescriptor(e,r);if(void 0===i){var o=Object.getPrototypeOf(e);return null===o?void 0:t(o,r,n)}if("value"in i)return i.value;var s=i.get;return void 0!==s?s.call(n):void 0}(r.prototype.__proto__||Object.getPrototypeOf(r.prototype),"clone",this).call(this);return null!=this.$__schemaType&&(t.$__schemaType=this.$__schemaType.clone()),t}}]),r}();a.prototype.OptionsConstructor=o,a.defaultOptions={},t.exports=a}).call(this,r(11))},function(t,e,r){"use strict";var n=r(9),i=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).apply(this,arguments))}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,n),e}(),o=r(10);Object.defineProperty(i.prototype,"of",o),t.exports=i},function(t,e,r){"use strict";(function(t){
/*!
 * Module dependencies.
 */
var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=r(14).get().Binary,o=r(19),s=r(13),a=r(27);
/*!
 * ignore
 */
function u(e){return e&&"object"===(void 0===e?"undefined":n(e))&&!(e instanceof Date)&&!(e instanceof s)&&(!Array.isArray(e)||e.length>0)&&!(e instanceof t)&&!(e instanceof o)&&!(e instanceof i)}e.flatten=
/*!
 * ignore
 */
function e(r,n,i,o){var s=void 0;s=r&&a(r)&&!t.isBuffer(r)?Object.keys(r.toObject({transform:!1,virtuals:!1})):Object.keys(r||{});var c=s.length;var l={};n=n?n+".":"";for(var f=0;f<c;++f){var h=s[f],p=r[h];l[n+h]=p;var y=o&&o.path&&o.path(n+h),d=o&&o.nested&&o.nested[n+h];if(!y||"Mixed"!==y.instance){if(u(p)){if(i&&i.skipArrays&&Array.isArray(p))continue;var v=e(p,n+h,i,o);for(var _ in v)l[_]=v[_];Array.isArray(p)&&(l[n+h]=p)}if(d){var m=Object.keys(o.paths),g=!0,b=!1,w=void 0;try{for(var O,S=m[Symbol.iterator]();!(g=(O=S.next()).done);g=!0){var E=O.value;E.startsWith(n+h+".")&&!l.hasOwnProperty(E)&&(l[E]=void 0)}}catch(t){b=!0,w=t}finally{try{!g&&S.return&&S.return()}finally{if(b)throw w}}}}}return l}
/*!
 * ignore
 */,e.modifiedPaths=function e(r,n,i){var o=Object.keys(r||{});var s=o.length;i=i||{};n=n?n+".":"";for(var c=0;c<s;++c){var l=o[c],f=r[l];i[n+l]=!0,a(f)&&!t.isBuffer(f)&&(f=f.toObject({transform:!1,virtuals:!1})),u(f)&&e(f,n+l,i)}return i}}).call(this,r(1).Buffer)},function(t,e,r){"use strict";var n=r(5);
/*!
 * Like `schema.path()`, except with a document, because impossible to
 * determine path type without knowing the embedded discriminator key.
 */t.exports=function t(e,r,i){for(var o=(i=i||{}).typeOnly,s=r.split("."),a=null,u="adhocOrUndefined",c=0;c<s.length;++c){var l=s.slice(0,c+1).join(".");if(null!=(a=e.schema.path(l))){if("Mixed"===a.instance)return o?"real":a;if(u=e.schema.pathType(l),(a.$isSingleNested||a.$isMongooseDocumentArrayElement)&&null!=a.schema.discriminators){var f=a.schema.discriminators,h=e.get(l+"."+n(a,"schema.options.discriminatorKey"));if(null==h||null==f[h])continue;var p=s.slice(c+1).join(".");return t(e.get(l),p,i)}}else u="adhocOrUndefined"}return o?u:a}},function(t,e,r){"use strict";
/*!
 * ignore
 */
/*!
 * Returns this documents _id cast to a string.
 */
function n(){return null!=this._id?String(this._id):null}t.exports=function(t){!t.paths.id&&!t.options.noVirtualId&&t.options.id&&t.virtual("id").get(n)}},function(t,e,r){"use strict";var n=r(92);
/*!
 * ignore
 */t.exports=function(t){var e=Object.keys(t),r=e.length,i=null;if(1===r&&"_id"===e[0])i=!!t[e[r]];else for(;r--;)if("_id"!==e[r]&&n(t[e[r]])){i=!t[e[r]];break}return i}},function(t,e,r){"use strict";
/*!
 * Module dependencies.
 */var n=r(6),i=r(18).EventEmitter,o=r(4),s=r(52),a=r(13),u=o.ValidationError,c=r(75),l=r(20);function f(t,e,r,i,u){if(!(this instanceof f))return new f(t,e,r,i,u);if(l(e)&&!e.instanceOfSchema&&(e=new s(e)),e=this.schema||e,!this.schema&&e.options._id&&void 0===(t=t||{})._id&&(t._id=new a),!e)throw new o.MissingSchemaError;for(var h in this.$__setSchema(e),n.call(this,t,r,i,u),c(this,e,{decorateDoc:!0}),e.methods)this[h]=e.methods[h];for(var p in e.statics)this[p]=e.statics[p]}
/*!
 * Inherit from the NodeJS document
 */f.prototype=Object.create(n.prototype),f.prototype.constructor=f,
/*!
 * ignore
 */
f.events=new i,
/*!
 * Browser doc exposes the event emitter API
 */
f.$emitter=new i,["on","once","emit","listeners","removeListener","setMaxListeners","removeAllListeners","addListener"].forEach(function(t){f[t]=function(){return f.$emitter[t].apply(f.$emitter,arguments)}}),
/*!
 * Module exports.
 */
f.ValidationError=u,t.exports=f}])});
},{}],10:[function(require,module,exports){
window.$ = $ = window.jQuery = require("jquery");
//var bootst = require('bootstrap')
require("bootstrap-table");

var localIPpromise = require("binternalip");
var ipLibrary = require("ip");
var mongoose = require("mongoose");
var editor = {};
var ipServer = "localhost";

$.get("/ipserver", function (data, status) {
  ipServer = data;
  console.log("/ipserver answered: ", data);
  initGrape();
  window.editor = editor;
});

function initGrape() {
  editor = grapesjs.init({
    dragMode: "absolute",
    height: "100%",
    container: "#gjs",
    fromElement: true,
    allowScripts: 1,
    canvas: {
      styles: ["assets/css/toggle.css"],
    },
    panels: {},
    assetManager: {
      assets: [
        "images/fruits/emoji-apple.png",
        "images/fruits/emoji-apple-click.png",
        "images/fruits/emoji-orange.png",
        "images/fruits/emoji-orange-click.png",
        "images/fruits/emoji-banana.png",
        "images/fruits/emoji-banana-click.png",
        "images/fruits/background.png",
        // Pass an object with your properties
        {
          type: "image",
          src: "http://placehold.it/350x250/459ba8/fff/image2.jpg",
          height: 350,
          width: 250,
        },
        {
          type: "image",
          src: "http://placehold.it/350x250/78c5d6/fff/image1.jpg",
          height: 200,
          width: 200,
        },
        {
          // As the 'image' is the base type of assets, omitting it will
          // be set as `image` by default
          src: "http://placehold.it/350x250/79c267/fff/image3.jpg",
          height: 350,
          width: 250,
        },
      ],
    },
    styleManager: {},
    blockManager: {},
    traitManager: {},
    //Persistance
    // Default configurations
    storageManager: {
      id: "gjs-", // Prefix identifier that will be used on parameters
      //type: 'local',          // Type of the storage
      //type: null,          // Type of the storage
      type: "local", // Type of the storage
      stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
      autosave: true, // Store data automatically
      autoload: true, // Autoload stored data on init
      contentTypeJson: true,
    },
    // TO READ: this plugin loads default blocks
    plugins: [
      "oscar_socket",
      "oscar_ip",
      "oscar_button",
      "oscar_slider",
      "gjs-preset-webpage",
      "grapesjs-custom-code",
      "grapesjs-parser-postcss",
      "grapesjs-touch",
      "grapesjs-tooltip",
    ],
    pluginsOpts: {
      oscar_socket: {
        ipserver: ipServer,
      },
      oscar_slider: {
        ipserver: ipServer,
      },
      oscar_button: {
        ipserver: ipServer,
      },
      "grapesjs-tooltip": {},
      "gjs-preset-webpage": {
        blocks: [],
        formsOpts: false,
        exportOpts: false,
        navbarOpts: false,
        countdownOpts: false,
        showStylesOnChange: true,
        modalImportTitle: "Import Template",
        modalImportLabel:
          '<div style="margin-bottom: 10px; font-size: 13px;">Paste here your HTML/CSS and click Import</div>',
        modalImportContent: function (editor) {
          return editor.getHtml() + "<style>" + editor.getCss() + "</style>";
        },
      },
    },
  });
  // Define Panels, Modals and Commdans
  var pn = editor.Panels;
  var modal = editor.Modal;
  var commands = editor.Commands;

  //END EDITOR INIT

  //FIXES MODAL FOR CUSTOM CODE PLUGIN
  editor.on("run:custom-code:open-modal", () =>
    editor.once("modal:close", () => {
      const { Commands } = editor;
      if (Commands.isActive("custom-code:open-modal")) {
        Commands.stop("custom-code:open-modal");
      }
    })
  );

  //OPEN MODAL IF UPDATE
  editor.on("load", () => {
    $.ajax({
      type: "POST",
      url: "/update",
    })
      .done(function (result) {
        console.log(result);
        if (result.title) {
          var mdlClass = "modal-login";
          var mdlDialog = document.querySelector(".gjs-mdl-dialog");
          mdlDialog.className += " " + mdlClass;
          modal.setTitle(result.title);
          modal.setContent(result.content);
          modal.open();
        }
      })
      .fail(function (jqXHR, textStatus) {
        console.log(jqXHR);
      });
  });

  //Turn OFF editable mode on Preview
  editor.on("run:preview", () => {
    // Execute a callback on all inner components starting from the root
    var res = editor.store((res) => console.log("Store callback"));
    console.log(res);
    editor.DomComponents.getWrapper().onAll((comp) =>
      comp.set({
        editable: false,
        draggable: false,
      })
    );
    const domComponents = editor.DomComponents;
    var code = domComponents.getComponents();
    $.ajax({
      type: "POST",
      url: "/save/preview",
      data: {
        project: res,
      },
    })
      .done(function (result) {
        var msg = JSON.parse(result);
        console.log(msg);
      })
      .fail(function (jqXHR, textStatus) {
        console.log(jqXHR);
      });
    //console.log("Components: ", code.models);
    //editor.socket.emit("code", code);
  });

  //Turn ON editable mode on Preview
  editor.on("stop:preview", () => {
    // Execute a callback on all inner components starting from the root
    editor.DomComponents.getWrapper().onAll((comp) =>
      comp.set({
        editable: true,
        draggable: true,
      })
    );
  });

  //FIXES MODAL FOR IMPORT HTML CODE
  editor.on("run:gjs-open-import-webpage", () =>
    editor.once("modal:close", () => {
      const { Commands } = editor;
      if (Commands.isActive("gjs-open-import-webpage")) {
        Commands.stop("gjs-open-import-webpage");
      }
    })
  );

  //Set General MODAL
  function setModal(title, namecontainer, buttonclicked) {
    var mdlClass = "modal-login";
    var container = document.getElementById(namecontainer);
    var mdlDialog = document.querySelector(".gjs-mdl-dialog");
    mdlDialog.className += " " + mdlClass;
    container.style.display = "block";
    modal.setTitle(title);
    modal.from = buttonclicked;
    modal.setContent(container);
    modal.open();
    modal.getModel().once("change:open", function () {
      mdlDialog.className = mdlDialog.className.replace(mdlClass, "");
    });
  }

  //FORM LogginIn
  $("#login_button").click(function (e) {
    e.preventDefault();
    showLoader();
    $("#login-messages-div").hide();
    var email = $("#email").val();
    var password = $("#password").val();
    $.ajax({
      type: "POST",
      url: "/auth",
      data: {
        email: email,
        password: password,
      },
      dataType: "html",
    })
      .done(function (result) {
        hideLoader();
        var msg = JSON.parse(result);
        console.log("token: ", msg.token);
        window.localStorage.setItem("token", msg.token);
        console.log(
          "token after loggin:",
          window.localStorage.getItem("token")
        );
        isloggedIn(modal.from + "");
        RemoteStorage.set({
          id: "gjs-", // Prefix identifier that will be used on parameters
          //type: 'local',          // Type of the storage
          //type: null,          // Type of the storage
          type: "remote", // Type of the storage
          stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
          urlStore: "http://" + ipServer + ":8080/save",
          urlLoad: "http://" + ipServer + ":8080/load",
          autosave: false, // Store data automatically
          autoload: false, // Autoload stored data on init
          contentTypeJson: true,
          params: { x_auth_token: msg.token },
          headers: { x_auth_token: msg.token },
        });
      })
      .fail(function (jqXHR, textStatus) {
        hideLoader();
        window.localStorage.removeItem("token");
        var msg = JSON.parse(jqXHR.responseText);
        if (typeof msg.msg != "undefined") {
          $("#login-messages").html(msg.msg);
          $("#login-messages-div").show();
        }
      });
  });

  //FORM LogginOut
  $(".logout-button").click(function () {
    console.log(editor.StorageManager.get("remote"));
    window.localStorage.removeItem("token");
    console.log("token after logout:", window.localStorage.getItem("token"));
    RemoteStorage.set({
      id: "gjs-", // Prefix identifier that will be used on parameters
      //type: 'local',          // Type of the storage
      //type: null,          // Type of the storage
      type: "remote", // Type of the storage
      stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
      urlStore: "http://" + ipServer + ":8080/save",
      urlLoad: "http://" + ipServer + ":8080/load",
      autosave: false, // Store data automatically
      autoload: false, // Autoload stored data on init
      contentTypeJson: true,
      params: { x_auth_token: null },
      headers: { x_auth_token: null },
    });
    modal.close();
    console.log(editor.StorageManager.get("remote"));
    // $.ajax({
    //   type: "GET",
    //   url: "/logout",
    //   dataType: "html",
    // }).done(function (result) {
    //   modal.close();
    // });
  });
  function showLoader() {
    $("#login-form").hide();
    $("#table-container").hide();
    $("#loader").show();
    $("#loader-table").show();
  }
  function hideLoader() {
    $("#login-form").show();
    $("#table-container").show();
    $("#loader").hide();
    $("#loader-table").hide();
  }
  //Check If user is loggedIn
  function isloggedIn(type) {
    var isAutenthicated = false;
    setModal("Login", "login-panel", type);
    //console.log(window.localStorage.getItem("token"));
    $.ajax({
      url: "/auth/user",
      type: "post",
      data: {},
      headers: {
        x_auth_token: window.localStorage.getItem("token"), //If your header name has spaces or any other char not appropriate
      },
      dataType: "json",
      success: function (data) {
        isAutenthicated = true;
        //console.log("success auth");
        console.info(data);
        initTable();
        updateProjects();
        setModal(type, "table-panel");
        if (type == "Save") {
          $("#load-button").hide();
          $("#save-button").show();
        } else if (type == "Load") {
          $("#load-button").show();
          $("#save-button").hide();
        }
      },
      error: function (data, status) {
        isAutenthicated = false;
        //console.log("fail auth");
        //console.info(data);
        setModal("Login", "login-panel", type);
      },
    });
  }
  function initTable() {
    var token = window.localStorage.getItem("token");
    //Check error in projects Table
    $("#projects-table").bootstrapTable({
      url: "/projects",
      ajaxOptions: {
        headers: { x_auth_token: token },
      },
      height: 300,
      columns: [
        {
          title: "Name",
          field: "name",
          sortable: true,
        },
        {
          title: "Size",
          field: "size",
          sortable: true,
        },
        {
          title: "Date",
          field: "date",
          sortable: true,
        },
        {
          title: "Actions",
          field: "action",
          clickToSelect: false,
          events: window.operateEvents,
          formatter: operateFormatter,
        },
      ],
      pagination: false,
      search: false,
      sortable: true,
      pageSize: 5,
      pageList: [],
      clickToSelect: true,
      singleSelect: true,
      onClickRow: function (row, $element) {
        $("#project-name").val(row.name);
        $("#project-name").attr("id-project", row._id);
        // row: the record corresponding to the clicked row,
        // $element: the tr element.
      },
      onLoadError: function (status, jqXHR) {
        //alert(status);
        console.log(jqXHR);
      },
    });
  }
  //Check for projects
  function updateProjects() {
    var token = window.localStorage.getItem("token");
    console.log("token in local storage:");
    console.log(token);
    $("#projects-table").bootstrapTable("refreshOptions", {
      url: "/projects",
      ajaxOptions: {
        headers: { x_auth_token: token },
      },
    });
  }
  window.operateEvents = {
    "click .like": function (e, value, row, index) {
      alert("You click like action, row: " + JSON.stringify(row));
    },
    "click .remove": function (e, value, row, index) {
      //console.log(row);
      //delete
      $.confirm({
        title: "Delete Project",
        content:
          "Are you sure you want to delete this project. You won't be able to recover it afterwards",
        buttons: {
          confirm: function () {
            $.ajax({
              type: "DELETE",
              url: "/remove/" + row._id,
              headers: {
                x_auth_token: window.localStorage.getItem("token"), //If your header name has spaces or any other char not appropriate
              },
              success: function (data) {
                $("#projects-table").bootstrapTable("refresh");
                $.alert(data.msg);
              },
              error: function (err) {
                console.log("error");
                console.log(err);
                $.alert(err);
              },
            });
          },
          cancel: function () {},
        },
      });
    },
  };

  function operateFormatter(value, row, index) {
    return [
      '<a class="remove icon" href="javascript:void(0)" title="Remove">',
      '<i class="fa fa-times-circle"></i>',
      "</a>",
    ].join("");
  }

  // Open Modal Command
  var mdlClass = "gjs-mdl-dialog-sm";
  commands.add("open-modal-login", (editor, sender, options = {}) => {
    //If it is save or load check if it is logged In
    if (options.type) {
      isloggedIn(options.type);
    }
    $("#login-messages-div").hide();
    var mdlDialog = document.querySelector(".gjs-mdl-dialog");
    mdlDialog.className += " " + mdlClass;
    modal.open();
    modal.getModel().once("change:open", function () {
      mdlDialog.className = mdlDialog.className.replace(mdlClass, "");
    });
  });

  //Add Save Panel Button
  pn.addButton("options", {
    id: "open-save",
    className: "fa fa-cloud-upload",
    command: function () {
      editor.runCommand("open-modal-login", {
        type: "Save",
      });
    },
    attributes: {
      title: "Save",
      "data-tooltip-pos": "bottom",
    },
  });
  //Add Load Panel Button
  pn.addButton("options", {
    id: "open-load",
    className: "fa fa-cloud-download",
    command: function () {
      editor.runCommand("open-modal-login", {
        type: "Load",
      });
    },
    attributes: {
      title: "Load",
      "data-tooltip-pos": "bottom",
    },
  });
  //Add About Button
  pn.addButton("options", {
    id: "open-info",
    className: "fa fa-question-circle",
    command: function () {
      setModal("About", "info-panel");
      editor.runCommand("open-modal-login");
    },
    attributes: {
      title: "About",
      "data-tooltip-pos": "bottom",
    },
  });

  editor.on("run:open-modal-login", function () {});

  const RemoteStorage = editor.StorageManager.get("remote").set({
    id: "gjs-", // Prefix identifier that will be used on parameters
    //type: 'local',          // Type of the storage
    //type: null,          // Type of the storage
    type: "remote", // Type of the storage
    stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
    urlStore: "http://" + ipServer + ":8080/save",
    urlLoad: "http://" + ipServer + ":8080/load",
    autosave: false, // Store data automatically
    autoload: false, // Autoload stored data on init
    contentTypeJson: true,
    params: { x_auth_token: window.localStorage.getItem("token") },
    headers: { x_auth_token: window.localStorage.getItem("token") },
  });

  //Save and Load
  const LocalStorage = editor.StorageManager.get("local");
  console.log("storages", editor.StorageManager.getStorages());

  // Save Action
  var saveName = document.getElementById("project-name");
  var saveButton = document.getElementById("save-button");
  let stored;
  saveButton.onclick = () => {
    showLoader();
    //sets the nanem of the project as parameter.
    editor.StorageManager.setCurrent("remote");
    RemoteStorage.set("params", {
      name: saveName.value,
      overwrite: false,
      visibility: "private",
    });
    stored = editor.store((res) => {
      hideLoader();
      editor.StorageManager.setCurrent("local");
      console.log("res", res);
      if (typeof res.error != "undefined") {
        $.alert(res.error);
      } else if (typeof res.confirm != "undefined") {
        $.confirm({
          title: "Overwriting",
          content: res.confirm,
          buttons: {
            confirm: function () {
              RemoteStorage.set("params", {
                name: saveName.value,
                overwrite: true,
                visibility: "private",
              });
              editor.StorageManager.setCurrent("remote");
              editor.store((e) => {
                hideLoader();
                editor.StorageManager.setCurrent("local");
                if (typeof e.error != "undefined") {
                  $.alert(e.error);
                }
                $.alert(e.msg);
              });
              modal.close();
            },
            cancel: function () {
              hideLoader();
            },
          },
        });
      } else {
        $.alert(res.msg);
        modal.close();
      }
    });
  };
  // Load Action
  var loadName = document.getElementById("project-name");
  var loadButton = document.getElementById("load-button");
  $("#project-name").change(function () {
    //alert("changed");
    //mongoose.Types.ObjectId.isValid
    if (mongoose.Types.ObjectId.isValid($("#project-name").val())) {
      $("#project-name").attr("id-project", $("#project-name").val());
    }
  });

  loadButton.onclick = () => {
    showLoader();
    $.confirm({
      title: "Load",
      content:
        "If you load this project, you will lose all information of your current project",
      buttons: {
        confirm: function () {
          RemoteStorage.set({
            urlLoad:
              "http://" +
              ipServer +
              ":8080/load/" +
              loadName.getAttribute("id-project"),
          });
          editor.StorageManager.setCurrent("remote");
          editor.load((res) => {
            hideLoader();
            console.log("res: " + res);
            if (Object.keys(res).length === 0) {
              //console.log("loaded: " + res);
              $.alert("Project doesn't exist or You are not Logged In");
            } else {
              //console.log('loaded', res)
              if (res.error) {
                $.alert("Check Your Internet Connection");
              } else {
                $.alert("Loaded Successfully");
                modal.close();
              }
            }
            editor.StorageManager.setCurrent("local");
          });
        },
        cancel: function () {
          hideLoader();
        },
      },
    });
  };

  //Upgrade
  $.get("/upgrade", function (data, status) {
    if (data.success) {
      //Add Notification
    }
  });

  //Create IP Label
  var IPLabel = pn.addButton("devices-c", {
    id: "ipButton",
    className: "someClass",
    label: "IP: ",
    command: null,
    attributes: {
      title: "Server IP",
    },
    active: false,
    disable: true,
  });

  getipServer();

  function getipServer() {
    IPLabel.set("label", "Server IP: " + editor.ipserver);
  }

  //Default value of editor.ip is localhost
  editor.ip = "localhost";

  localIPpromise.then((ipAddr) => {
    var ipv4 = "";
    for (let i = 0; i < ipAddr.length; i++) {
      if (ipLibrary.isV4Format(ipAddr[i])) {
        ipv4 = ipAddr[i];
        editor.ip = ipv4;
      }
    }
    if (editor.ip == "" || !ipLibrary.isV4Format(editor.ip)) {
      editor.ip = "localhost";
      //IPLabel.set("label", "Client IP: " + editor.ip);
    }
    console.log("editor.ip: ", editor.ip);
  });
  localIPpromise.catch((error) => {
    console.log("Error: ", error);
    editor.ip = "localhost";
    IPLabel.set("label", "IP: " + editor.ip);
  });

  // Add and beautify tooltips
  [
    ["sw-visibility", "Show Borders"],
    ["preview", "Preview"],
    ["fullscreen", "Fullscreen"],
    ["export-template", "See Code"],
    ["undo", "Undo"],
    ["redo", "Redo"],
    ["gjs-open-import-webpage", "Import"],
    ["canvas-clear", "Clear canvas"],
  ].forEach(function (item) {
    pn.getButton("options", item[0]).set("attributes", {
      title: item[1],
      "data-tooltip-pos": "bottom",
    });
  });
  [
    ["open-sm", "Style Manager"],
    ["open-tm", "OSC Settings"],
    ["open-layers", "Layers"],
    ["open-blocks", "Blocks"],
  ].forEach(function (item) {
    pn.getButton("views", item[0]).set("attributes", {
      title: item[1],
      "data-tooltip-pos": "bottom",
    });
  });
  var titles = document.querySelectorAll("*[title]");
  for (var i = 0; i < titles.length; i++) {
    var el = titles[i];
    var title = el.getAttribute("title");
    title = title ? title.trim() : "";
    if (!title) break;
    el.setAttribute("data-tooltip", title);
    el.setAttribute("title", "");
  }
  // Show borders by default
  //pn.getButton('options', 'sw-visibility').set('active', 1);
}

},{"binternalip":5,"bootstrap-table":6,"ip":7,"jquery":8,"mongoose":9}],11:[function(require,module,exports){
window.$ = window.jQuery = require("jquery");
var localIPpromise = require("binternalip");
//var localIPpromise = require('./webRTC.js');
var ipLibrary = require("ip");
var editor;
var ipServer = "localhost";

$.get("/ipserver", function (data, status) {
  ipServer = data;
  initGrape();
  runPreview();
});

function runPreview() {
  //Bug
  editor.runCommand("production");
}

function initGrape() {
  editor = grapesjs.init({
    height: "100%",
    container: "#gjs-oscar-preview",
    allowScripts: 1,
    panels: { defaults: [] },
    canvas: { styles: ["assets/css/toggle.css"] },
    // Default configurations
    storageManager: {
      id: "gjs-", // Prefix identifier that will be used on parameters
      //type: 'local',          // Type of the storage
      //type: null,          // Type of the storage
      type: "remote", // Type of the storage
      //stepsBeforeSave: 1,     // If autosave enabled, indicates how many changes are necessary before store method is triggered
      //urlStore: 'http://'+ipServer+':8080/store',
      urlLoad: "http://" + ipServer + ":8080/load",
    },
    // TO READ: this plugin loads default blocks
    plugins: [
      "oscar_socket",
      "oscar_ip",
      "oscar_button",
      "oscar_slider",
      "grapesjs-touch",
    ],
    pluginsOpts: {
      oscar_socket: {
        ipserver: ipServer,
      },
      oscar_slider: {
        ipserver: ipServer,
      },
      oscar_button: {
        ipserver: ipServer,
      },
    },
  });
  //END EDITOR INIT
  editor.on("storage:end:load", () => {
    const updateAll = (model) => {
      model.set({
        editable: false,
        selectable: false,
        hoverable: false,
        draggable: false,
      });
      model.get("components").each((model) => updateAll(model));
    };
    updateAll(editor.DomComponents.getWrapper());
  });
  // editor.on("stop:preview", () => {
  //   // Execute a callback on all inner components starting from the root
  //   editor.runCommand("preview");
  // });
  const RemoteStorage = editor.StorageManager.get("remote").set({
    id: "gjs-", // Prefix identifier that will be used on parameters
    //type: 'local',          // Type of the storage
    //type: null,          // Type of the storage
    type: "remote", // Type of the storage
    stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
    urlStore: "http://" + ipServer + ":8080/save",
    urlLoad: "http://" + ipServer + ":8080/show/preview",
    autosave: false, // Store data automatically
    autoload: false, // Autoload stored data on init
    contentTypeJson: true,
  });
  editor.StorageManager.setCurrent("remote");

  editor.load((res) => {
    console.log("res: " + res);
  });
  editor.Commands.add("production", {
    run() {
      // production mode ON
      //this.sender = sender;
      const cmdVis = "sw-visibility";
      if (!this.shouldRunSwVisibility) {
        this.shouldRunSwVisibility = editor.Commands.isActive(cmdVis);
      }

      this.shouldRunSwVisibility && editor.stopCommand(cmdVis);
      editor.getModel().stopDefault();

      const panels = editor.Panels.getPanels();
      const canvas = editor.Canvas.getElement();
      const editorEl = editor.getEl();
      const pfx = editor.Config.stylePrefix;

      if (!this.helper) {
        const helper = document.createElement("span");
        helper.className = `${pfx}off-prv fa fa-eye-slash`;
        editorEl.appendChild(helper);
        helper.onclick = () => this.stopCommand();
        this.helper = helper;
      }

      this.helper.style.display = "inline-block";
      const body = editor.Canvas.getBody();
      const elP = body.querySelectorAll(`.${this.ppfx}no-pointer`);
      elP.forEach((item) => (item.style.pointerEvents = val ? "" : "all"));

      panels.forEach((panel) => panel.set("visible", false));
      panels.forEach((panel) => console.log(panel.get("id")));
      panels.forEach((panel) => console.log(panel));
      panels.forEach((panel) => editor.Panels.removePanel(panel.get("id")));

      const canvasS = canvas.style;
      canvasS.width = "100%";
      canvasS.height = "100%";
      canvasS.top = "0";
      canvasS.left = "0";
      canvasS.padding = "0";
      canvasS.margin = "0";
      editor.refresh();
    },
    stop() {
      // production mode OFF
    },
  });
  editor.runCommand("production");
}

},{"binternalip":5,"ip":7,"jquery":8}]},{},[11,10])