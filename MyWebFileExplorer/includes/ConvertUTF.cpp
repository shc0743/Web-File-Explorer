// https://github.com/llvm/llvm-project/blob/main/llvm/lib/Support/ConvertUTF.cpp
/*===--- ConvertUTF.c - Universal Character Names conversions ---------------===
 *
 * Part of the LLVM Project, under the Apache License v2.0 with LLVM Exceptions.
 * See https://llvm.org/LICENSE.txt for license information.
 * SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception
 *
 *===------------------------------------------------------------------------=*/
/*
 * Copyright © 1991-2015 Unicode, Inc. All rights reserved.
 * Distributed under the Terms of Use in
 * http://www.unicode.org/copyright.html.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of the Unicode data files and any associated documentation
 * (the "Data Files") or Unicode software and any associated documentation
 * (the "Software") to deal in the Data Files or Software
 * without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, and/or sell copies of
 * the Data Files or Software, and to permit persons to whom the Data Files
 * or Software are furnished to do so, provided that
 * (a) this copyright and permission notice appear with all copies
 * of the Data Files or Software,
 * (b) this copyright and permission notice appear in associated
 * documentation, and
 * (c) there is clear notice in each modified Data File or in the Software
 * as well as in the documentation associated with the Data File(s) or
 * Software that the data or software has been modified.
 *
 * THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF
 * ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT OF THIRD PARTY RIGHTS.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS
 * NOTICE BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL
 * DAMAGES, OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
 * DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THE DATA FILES OR SOFTWARE.
 *
 * Except as contained in this notice, the name of a copyright holder
 * shall not be used in advertising or otherwise to promote the sale,
 * use or other dealings in these Data Files or Software without prior
 * written authorization of the copyright holder.
 */

/* ---------------------------------------------------------------------

    Conversions between UTF32, UTF-16, and UTF-8. Source code file.
    Author: Mark E. Davis, 1994.
    Rev History: Rick McGowan, fixes & updates May 2001.
    Sept 2001: fixed const & error conditions per
        mods suggested by S. Parent & A. Lillich.
    June 2002: Tim Dodd added detection and handling of incomplete
        source sequences, enhanced error detection, added casts
        to eliminate compiler warnings.
    July 2003: slight mods to back out aggressive FFFE detection.
    Jan 2004: updated switches in from-UTF8 conversions.
    Oct 2004: updated to use UNI_MAX_LEGAL_UTF32 in UTF-32 conversions.

    See the header file "ConvertUTF.h" for complete documentation.

------------------------------------------------------------------------ */

#include "ConvertUTF.h"
#ifdef CVTUTF_DEBUG
#include <stdio.h>
#endif
#include <assert.h>
#include "SwapByteOrder.h"
#include <vector>

/*
 * This code extensively uses fall-through switches.
 * Keep the compiler from warning about that.
 */
#if defined(__clang__) && defined(__has_warning)
# if __has_warning("-Wimplicit-fallthrough")
#  define ConvertUTF_DISABLE_WARNINGS \
    _Pragma("clang diagnostic push")  \
    _Pragma("clang diagnostic ignored \"-Wimplicit-fallthrough\"")
#  define ConvertUTF_RESTORE_WARNINGS \
    _Pragma("clang diagnostic pop")
# endif
#elif defined(__GNUC__) && __GNUC__ > 6
# define ConvertUTF_DISABLE_WARNINGS \
   _Pragma("GCC diagnostic push")    \
   _Pragma("GCC diagnostic ignored \"-Wimplicit-fallthrough\"")
# define ConvertUTF_RESTORE_WARNINGS \
   _Pragma("GCC diagnostic pop")
#endif
#ifndef ConvertUTF_DISABLE_WARNINGS
# define ConvertUTF_DISABLE_WARNINGS
#endif
#ifndef ConvertUTF_RESTORE_WARNINGS
# define ConvertUTF_RESTORE_WARNINGS
#endif

ConvertUTF_DISABLE_WARNINGS

namespace llvm {

static const int halfShift  = 10; /* used for shifting by 10 bits */

static const UTF32 halfBase = 0x0010000UL;
static const UTF32 halfMask = 0x3FFUL;

#define UNI_SUR_HIGH_START  (UTF32)0xD800
#define UNI_SUR_HIGH_END    (UTF32)0xDBFF
#define UNI_SUR_LOW_START   (UTF32)0xDC00
#define UNI_SUR_LOW_END     (UTF32)0xDFFF

/* --------------------------------------------------------------------- */

/*
 * Index into the table below with the first byte of a UTF-8 sequence to
 * get the number of trailing bytes that are supposed to follow it.
 * Note that *legal* UTF-8 values can't have 4 or 5-bytes. The table is
 * left as-is for anyone who may want to do such conversion, which was
 * allowed in earlier algorithms.
 */
static const char trailingBytesForUTF8[256] = {
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3,4,4,4,4,5,5,5,5
};

/*
 * Magic values subtracted from a buffer value during UTF8 conversion.
 * This table contains as many values as there might be trailing bytes
 * in a UTF-8 sequence.
 */
static const UTF32 offsetsFromUTF8[6] = { 0x00000000UL, 0x00003080UL, 0x000E2080UL,
                     0x03C82080UL, 0xFA082080UL, 0x82082080UL };

/*
 * Once the bits are split out into bytes of UTF-8, this is a mask OR-ed
 * into the first byte, depending on how many bytes follow.  There are
 * as many entries in this table as there are UTF-8 sequence types.
 * (I.e., one byte sequence, two byte... etc.). Remember that sequencs
 * for *legal* UTF-8 will be 4 or fewer bytes total.
 */
static const UTF8 firstByteMark[7] = { 0x00, 0x00, 0xC0, 0xE0, 0xF0, 0xF8, 0xFC };

/* --------------------------------------------------------------------- */

/* The interface converts a whole buffer to avoid function-call overhead.
 * Constants have been gathered. Loops & conditionals have been removed as
 * much as possible for efficiency, in favor of drop-through switches.
 * (See "Note A" at the bottom of the file for equivalent code.)
 * If your compiler supports it, the "isLegalUTF8" call can be turned
 * into an inline function.
 */


/* --------------------------------------------------------------------- */

ConversionResult ConvertUTF32toUTF16 (
        const UTF32** sourceStart, const UTF32* sourceEnd,
        UTF16** targetStart, UTF16* targetEnd, ConversionFlags flags) {
    ConversionResult result = conversionOK;
    const UTF32* source = *sourceStart;
    UTF16* target = *targetStart;
    while (source < sourceEnd) {
        UTF32 ch;
        if (target >= targetEnd) {
            result = targetExhausted; break;
        }
        ch = *source++;
        if (ch <= UNI_MAX_BMP) { /* Target is a character <= 0xFFFF */
            /* UTF-16 surrogate values are illegal in UTF-32; 0xffff or 0xfffe are both reserved values */
            if (ch >= UNI_SUR_HIGH_START && ch <= UNI_SUR_LOW_END) {
                if (flags == strictConversion) {
                    --source; /* return to the illegal value itself */
                    result = sourceIllegal;
                    break;
                } else {
                    *target++ = UNI_REPLACEMENT_CHAR;
                }
            } else {
                *target++ = (UTF16)ch; /* normal case */
            }
        } else if (ch > UNI_MAX_LEGAL_UTF32) {
            if (flags == strictConversion) {
                result = sourceIllegal;
            } else {
                *target++ = UNI_REPLACEMENT_CHAR;
            }
        } else {
            /* target is a character in range 0xFFFF - 0x10FFFF. */
            if (target + 1 >= targetEnd) {
                --source; /* Back up source pointer! */
                result = targetExhausted; break;
            }
            ch -= halfBase;
            *target++ = (UTF16)((ch >> halfShift) + UNI_SUR_HIGH_START);
            *target++ = (UTF16)((ch & halfMask) + UNI_SUR_LOW_START);
        }
    }
    *sourceStart = source;
    *targetStart = target;
    return result;
}

/* --------------------------------------------------------------------- */

ConversionResult ConvertUTF16toUTF32 (
        const UTF16** sourceStart, const UTF16* sourceEnd,
        UTF32** targetStart, UTF32* targetEnd, ConversionFlags flags) {
    ConversionResult result = conversionOK;
    const UTF16* source = *sourceStart;
    UTF32* target = *targetStart;
    UTF32 ch, ch2;
    while (source < sourceEnd) {
        const UTF16* oldSource = source; /*  In case we have to back up because of target overflow. */
        ch = *source++;
        /* If we have a surrogate pair, convert to UTF32 first. */
        if (ch >= UNI_SUR_HIGH_START && ch <= UNI_SUR_HIGH_END) {
            /* If the 16 bits following the high surrogate are in the source buffer... */
            if (source < sourceEnd) {
                ch2 = *source;
                /* If it's a low surrogate, convert to UTF32. */
                if (ch2 >= UNI_SUR_LOW_START && ch2 <= UNI_SUR_LOW_END) {
                    ch = ((ch - UNI_SUR_HIGH_START) << halfShift)
                        + (ch2 - UNI_SUR_LOW_START) + halfBase;
                    ++source;
                } else if (flags == strictConversion) { /* it's an unpaired high surrogate */
                    --source; /* return to the illegal value itself */
                    result = sourceIllegal;
                    break;
                }
            } else { /* We don't have the 16 bits following the high surrogate. */
                --source; /* return to the high surrogate */
                result = sourceExhausted;
                break;
            }
        } else if (flags == strictConversion) {
            /* UTF-16 surrogate values are illegal in UTF-32 */
            if (ch >= UNI_SUR_LOW_START && ch <= UNI_SUR_LOW_END) {
                --source; /* return to the illegal value itself */
                result = sourceIllegal;
                break;
            }
        }
        if (target >= targetEnd) {
            source = oldSource; /* Back up source pointer! */
            result = targetExhausted; break;
        }
        *target++ = ch;
    }
    *sourceStart = source;
    *targetStart = target;
#ifdef CVTUTF_DEBUG
if (result == sourceIllegal) {
    fprintf(stderr, "ConvertUTF16toUTF32 illegal seq 0x%04x,%04x\n", ch, ch2);
    fflush(stderr);
}
#endif
    return result;
}
ConversionResult ConvertUTF16toUTF8 (
        const UTF16** sourceStart, const UTF16* sourceEnd,
        UTF8** targetStart, UTF8* targetEnd, ConversionFlags flags) {
    ConversionResult result = conversionOK;
    const UTF16* source = *sourceStart;
    UTF8* target = *targetStart;
    while (source < sourceEnd) {
        UTF32 ch;
        unsigned short bytesToWrite = 0;
        const UTF32 byteMask = 0xBF;
        const UTF32 byteMark = 0x80;
        const UTF16* oldSource = source; /* In case we have to back up because of target overflow. */
        ch = *source++;
        /* If we have a surrogate pair, convert to UTF32 first. */
        if (ch >= UNI_SUR_HIGH_START && ch <= UNI_SUR_HIGH_END) {
            /* If the 16 bits following the high surrogate are in the source buffer... */
            if (source < sourceEnd) {
                UTF32 ch2 = *source;
                /* If it's a low surrogate, convert to UTF32. */
                if (ch2 >= UNI_SUR_LOW_START && ch2 <= UNI_SUR_LOW_END) {
                    ch = ((ch - UNI_SUR_HIGH_START) << halfShift)
                        + (ch2 - UNI_SUR_LOW_START) + halfBase;
                    ++source;
                } else if (flags == strictConversion) { /* it's an unpaired high surrogate */
                    --source; /* return to the illegal value itself */
                    result = sourceIllegal;
                    break;
                }
            } else { /* We don't have the 16 bits following the high surrogate. */
                --source; /* return to the high surrogate */
                result = sourceExhausted;
                break;
            }
        } else if (flags == strictConversion) {
            /* UTF-16 surrogate values are illegal in UTF-32 */
            if (ch >= UNI_SUR_LOW_START && ch <= UNI_SUR_LOW_END) {
                --source; /* return to the illegal value itself */
                result = sourceIllegal;
                break;
            }
        }
        /* Figure out how many bytes the result will require */
        if (ch < (UTF32)0x80) {      bytesToWrite = 1;
        } else if (ch < (UTF32)0x800) {     bytesToWrite = 2;
        } else if (ch < (UTF32)0x10000) {   bytesToWrite = 3;
        } else if (ch < (UTF32)0x110000) {  bytesToWrite = 4;
        } else {                            bytesToWrite = 3;
                                            ch = UNI_REPLACEMENT_CHAR;
        }

        target += bytesToWrite;
        if (target > targetEnd) {
            source = oldSource; /* Back up source pointer! */
            target -= bytesToWrite; result = targetExhausted; break;
        }
        switch (bytesToWrite) { /* note: everything falls through. */
            case 4: *--target = (UTF8)((ch | byteMark) & byteMask); ch >>= 6;
            case 3: *--target = (UTF8)((ch | byteMark) & byteMask); ch >>= 6;
            case 2: *--target = (UTF8)((ch | byteMark) & byteMask); ch >>= 6;
            case 1: *--target =  (UTF8)(ch | firstByteMark[bytesToWrite]);
        }
        target += bytesToWrite;
    }
    *sourceStart = source;
    *targetStart = target;
    return result;
}

/* --------------------------------------------------------------------- */

ConversionResult ConvertUTF32toUTF8 (
        const UTF32** sourceStart, const UTF32* sourceEnd,
        UTF8** targetStart, UTF8* targetEnd, ConversionFlags flags) {
    ConversionResult result = conversionOK;
    const UTF32* source = *sourceStart;
    UTF8* target = *targetStart;
    while (source < sourceEnd) {
        UTF32 ch;
        unsigned short bytesToWrite = 0;
        const UTF32 byteMask = 0xBF;
        const UTF32 byteMark = 0x80;
        ch = *source++;
        if (flags == strictConversion ) {
            /* UTF-16 surrogate values are illegal in UTF-32 */
            if (ch >= UNI_SUR_HIGH_START && ch <= UNI_SUR_LOW_END) {
                --source; /* return to the illegal value itself */
                result = sourceIllegal;
                break;
            }
        }
        /*
         * Figure out how many bytes the result will require. Turn any
         * illegally large UTF32 things (> Plane 17) into replacement chars.
         */
        if (ch < (UTF32)0x80) {      bytesToWrite = 1;
        } else if (ch < (UTF32)0x800) {     bytesToWrite = 2;
        } else if (ch < (UTF32)0x10000) {   bytesToWrite = 3;
        } else if (ch <= UNI_MAX_LEGAL_UTF32) {  bytesToWrite = 4;
        } else {                            bytesToWrite = 3;
                                            ch = UNI_REPLACEMENT_CHAR;
                                            result = sourceIllegal;
        }

        target += bytesToWrite;
        if (target > targetEnd) {
            --source; /* Back up source pointer! */
            target -= bytesToWrite; result = targetExhausted; break;
        }
        switch (bytesToWrite) { /* note: everything falls through. */
            case 4: *--target = (UTF8)((ch | byteMark) & byteMask); ch >>= 6;
            case 3: *--target = (UTF8)((ch | byteMark) & byteMask); ch >>= 6;
            case 2: *--target = (UTF8)((ch | byteMark) & byteMask); ch >>= 6;
            case 1: *--target = (UTF8) (ch | firstByteMark[bytesToWrite]);
        }
        target += bytesToWrite;
    }
    *sourceStart = source;
    *targetStart = target;
    return result;
}

/* --------------------------------------------------------------------- */

/*
 * Utility routine to tell whether a sequence of bytes is legal UTF-8.
 * This must be called with the length pre-determined by the first byte.
 * If not calling this from ConvertUTF8to*, then the length can be set by:
 *  length = trailingBytesForUTF8[*source]+1;
 * and the sequence is illegal right away if there aren't that many bytes
 * available.
 * If presented with a length > 4, this returns false.  The Unicode
 * definition of UTF-8 goes up to 4-byte sequences.
 */

static Boolean isLegalUTF8(const UTF8 *source, int length) {
    UTF8 a;
    const UTF8 *srcptr = source+length;
    switch (length) {
    default: return false;
        /* Everything else falls through when "true"... */
    case 4: if ((a = (*--srcptr)) < 0x80 || a > 0xBF) return false;
    case 3: if ((a = (*--srcptr)) < 0x80 || a > 0xBF) return false;
    case 2: if ((a = (*--srcptr)) < 0x80 || a > 0xBF) return false;

        switch (*source) {
            /* no fall-through in this inner switch */
            case 0xE0: if (a < 0xA0) return false; break;
            case 0xED: if (a > 0x9F) return false; break;
            case 0xF0: if (a < 0x90) return false; break;
            case 0xF4: if (a > 0x8F) return false; break;
            default:   if (a < 0x80) return false;
        }

    case 1: if (*source >= 0x80 && *source < 0xC2) return false;
    }
    if (*source > 0xF4) return false;
    return true;
}

/* --------------------------------------------------------------------- */

/*
 * Exported function to return whether a UTF-8 sequence is legal or not.
 * This is not used here; it's just exported.
 */
Boolean isLegalUTF8Sequence(const UTF8 *source, const UTF8 *sourceEnd) {
    int length = trailingBytesForUTF8[*source]+1;
    if (length > sourceEnd - source) {
        return false;
    }
    return isLegalUTF8(source, length);
}

/*
 * Exported function to return the size of the first utf-8 code unit sequence,
 * Or 0 if the sequence is not valid;
 */
unsigned getUTF8SequenceSize(const UTF8 *source, const UTF8 *sourceEnd) {
  int length = trailingBytesForUTF8[*source] + 1;
  return (length <= sourceEnd - source && isLegalUTF8(source, length)) ? length
                                                                       : 0;
}

/* --------------------------------------------------------------------- */

static unsigned
findMaximalSubpartOfIllFormedUTF8Sequence(const UTF8 *source,
                                          const UTF8 *sourceEnd) {
  UTF8 b1, b2, b3;

  assert(!isLegalUTF8Sequence(source, sourceEnd));

  /*
   * Unicode 6.3.0, D93b:
   *
   *   Maximal subpart of an ill-formed subsequence: The longest code unit
   *   subsequence starting at an unconvertible offset that is either:
   *   a. the initial subsequence of a well-formed code unit sequence, or
   *   b. a subsequence of length one.
   */

  if (source == sourceEnd)
    return 0;

  /*
   * Perform case analysis.  See Unicode 6.3.0, Table 3-7. Well-Formed UTF-8
   * Byte Sequences.
   */

  b1 = *source;
  ++source;
  if (b1 >= 0xC2 && b1 <= 0xDF) {
    /*
     * First byte is valid, but we know that this code unit sequence is
     * invalid, so the maximal subpart has to end after the first byte.
     */
    return 1;
  }

  if (source == sourceEnd)
    return 1;

  b2 = *source;
  ++source;

  if (b1 == 0xE0) {
    return (b2 >= 0xA0 && b2 <= 0xBF) ? 2 : 1;
  }
  if (b1 >= 0xE1 && b1 <= 0xEC) {
    return (b2 >= 0x80 && b2 <= 0xBF) ? 2 : 1;
  }
  if (b1 == 0xED) {
    return (b2 >= 0x80 && b2 <= 0x9F) ? 2 : 1;
  }
  if (b1 >= 0xEE && b1 <= 0xEF) {
    return (b2 >= 0x80 && b2 <= 0xBF) ? 2 : 1;
  }
  if (b1 == 0xF0) {
    if (b2 >= 0x90 && b2 <= 0xBF) {
      if (source == sourceEnd)
        return 2;

      b3 = *source;
      return (b3 >= 0x80 && b3 <= 0xBF) ? 3 : 2;
    }
    return 1;
  }
  if (b1 >= 0xF1 && b1 <= 0xF3) {
    if (b2 >= 0x80 && b2 <= 0xBF) {
      if (source == sourceEnd)
        return 2;

      b3 = *source;
      return (b3 >= 0x80 && b3 <= 0xBF) ? 3 : 2;
    }
    return 1;
  }
  if (b1 == 0xF4) {
    if (b2 >= 0x80 && b2 <= 0x8F) {
      if (source == sourceEnd)
        return 2;

      b3 = *source;
      return (b3 >= 0x80 && b3 <= 0xBF) ? 3 : 2;
    }
    return 1;
  }

  assert((b1 >= 0x80 && b1 <= 0xC1) || b1 >= 0xF5);
  /*
   * There are no valid sequences that start with these bytes.  Maximal subpart
   * is defined to have length 1 in these cases.
   */
  return 1;
}

/* --------------------------------------------------------------------- */

/*
 * Exported function to return the total number of bytes in a codepoint
 * represented in UTF-8, given the value of the first byte.
 */
unsigned getNumBytesForUTF8(UTF8 first) {
  return trailingBytesForUTF8[first] + 1;
}

/* --------------------------------------------------------------------- */

/*
 * Exported function to return whether a UTF-8 string is legal or not.
 * This is not used here; it's just exported.
 */
Boolean isLegalUTF8String(const UTF8 **source, const UTF8 *sourceEnd) {
    while (*source != sourceEnd) {
        int length = trailingBytesForUTF8[**source] + 1;
        if (length > sourceEnd - *source || !isLegalUTF8(*source, length))
            return false;
        *source += length;
    }
    return true;
}

/* --------------------------------------------------------------------- */

ConversionResult ConvertUTF8toUTF16 (
        const UTF8** sourceStart, const UTF8* sourceEnd,
        UTF16** targetStart, UTF16* targetEnd, ConversionFlags flags) {
    ConversionResult result = conversionOK;
    const UTF8* source = *sourceStart;
    UTF16* target = *targetStart;
    while (source < sourceEnd) {
        UTF32 ch = 0;
        unsigned short extraBytesToRead = trailingBytesForUTF8[*source];
        if (extraBytesToRead >= sourceEnd - source) {
            result = sourceExhausted; break;
        }
        /* Do this check whether lenient or strict */
        if (!isLegalUTF8(source, extraBytesToRead+1)) {
            result = sourceIllegal;
            break;
        }
        /*
         * The cases all fall through. See "Note A" below.
         */
        switch (extraBytesToRead) {
            case 5: ch += *source++; ch <<= 6; /* remember, illegal UTF-8 */
            case 4: ch += *source++; ch <<= 6; /* remember, illegal UTF-8 */
            case 3: ch += *source++; ch <<= 6;
            case 2: ch += *source++; ch <<= 6;
            case 1: ch += *source++; ch <<= 6;
            case 0: ch += *source++;
        }
        ch -= offsetsFromUTF8[extraBytesToRead];

        if (target >= targetEnd) {
            source -= (extraBytesToRead+1); /* Back up source pointer! */
            result = targetExhausted; break;
        }
        if (ch <= UNI_MAX_BMP) { /* Target is a character <= 0xFFFF */
            /* UTF-16 surrogate values are illegal in UTF-32 */
            if (ch >= UNI_SUR_HIGH_START && ch <= UNI_SUR_LOW_END) {
                if (flags == strictConversion) {
                    source -= (extraBytesToRead+1); /* return to the illegal value itself */
                    result = sourceIllegal;
                    break;
                } else {
                    *target++ = UNI_REPLACEMENT_CHAR;
                }
            } else {
                *target++ = (UTF16)ch; /* normal case */
            }
        } else if (ch > UNI_MAX_UTF16) {
            if (flags == strictConversion) {
                result = sourceIllegal;
                source -= (extraBytesToRead+1); /* return to the start */
                break; /* Bail out; shouldn't continue */
            } else {
                *target++ = UNI_REPLACEMENT_CHAR;
            }
        } else {
            /* target is a character in range 0xFFFF - 0x10FFFF. */
            if (target + 1 >= targetEnd) {
                source -= (extraBytesToRead+1); /* Back up source pointer! */
                result = targetExhausted; break;
            }
            ch -= halfBase;
            *target++ = (UTF16)((ch >> halfShift) + UNI_SUR_HIGH_START);
            *target++ = (UTF16)((ch & halfMask) + UNI_SUR_LOW_START);
        }
    }
    *sourceStart = source;
    *targetStart = target;
    return result;
}

/* --------------------------------------------------------------------- */

static ConversionResult ConvertUTF8toUTF32Impl(
        const UTF8** sourceStart, const UTF8* sourceEnd,
        UTF32** targetStart, UTF32* targetEnd, ConversionFlags flags,
        Boolean InputIsPartial) {
    ConversionResult result = conversionOK;
    const UTF8* source = *sourceStart;
    UTF32* target = *targetStart;
    while (source < sourceEnd) {
        UTF32 ch = 0;
        unsigned short extraBytesToRead = trailingBytesForUTF8[*source];
        if (extraBytesToRead >= sourceEnd - source) {
            if (flags == strictConversion || InputIsPartial) {
                result = sourceExhausted;
                break;
            } else {
                result = sourceIllegal;

                /*
                 * Replace the maximal subpart of ill-formed sequence with
                 * replacement character.
                 */
                source += findMaximalSubpartOfIllFormedUTF8Sequence(source,
                                                                    sourceEnd);
                *target++ = UNI_REPLACEMENT_CHAR;
                continue;
            }
        }
        if (target >= targetEnd) {
            result = targetExhausted; break;
        }

        /* Do this check whether lenient or strict */
        if (!isLegalUTF8(source, extraBytesToRead+1)) {
            result = sourceIllegal;
            if (flags == strictConversion) {
                /* Abort conversion. */
                break;
            } else {
                /*
                 * Replace the maximal subpart of ill-formed sequence with
                 * replacement character.
                 */
                source += findMaximalSubpartOfIllFormedUTF8Sequence(source,
                                                                    sourceEnd);
                *target++ = UNI_REPLACEMENT_CHAR;
                continue;
            }
        }
        /*
         * The cases all fall through. See "Note A" below.
         */
        switch (extraBytesToRead) {
            case 5: ch += *source++; ch <<= 6;
            case 4: ch += *source++; ch <<= 6;
            case 3: ch += *source++; ch <<= 6;
            case 2: ch += *source++; ch <<= 6;
            case 1: ch += *source++; ch <<= 6;
            case 0: ch += *source++;
        }
        ch -= offsetsFromUTF8[extraBytesToRead];

        if (ch <= UNI_MAX_LEGAL_UTF32) {
            /*
             * UTF-16 surrogate values are illegal in UTF-32, and anything
             * over Plane 17 (> 0x10FFFF) is illegal.
             */
            if (ch >= UNI_SUR_HIGH_START && ch <= UNI_SUR_LOW_END) {
                if (flags == strictConversion) {
                    source -= (extraBytesToRead+1); /* return to the illegal value itself */
                    result = sourceIllegal;
                    break;
                } else {
                    *target++ = UNI_REPLACEMENT_CHAR;
                }
            } else {
                *target++ = ch;
            }
        } else { /* i.e., ch > UNI_MAX_LEGAL_UTF32 */
            result = sourceIllegal;
            *target++ = UNI_REPLACEMENT_CHAR;
        }
    }
    *sourceStart = source;
    *targetStart = target;
    return result;
}

ConversionResult ConvertUTF8toUTF32Partial(const UTF8 **sourceStart,
                                           const UTF8 *sourceEnd,
                                           UTF32 **targetStart,
                                           UTF32 *targetEnd,
                                           ConversionFlags flags) {
  return ConvertUTF8toUTF32Impl(sourceStart, sourceEnd, targetStart, targetEnd,
                                flags, /*InputIsPartial=*/true);
}

ConversionResult ConvertUTF8toUTF32(const UTF8 **sourceStart,
                                    const UTF8 *sourceEnd, UTF32 **targetStart,
                                    UTF32 *targetEnd, ConversionFlags flags) {
  return ConvertUTF8toUTF32Impl(sourceStart, sourceEnd, targetStart, targetEnd,
                                flags, /*InputIsPartial=*/false);
}

// These lines are added:
template <typename T>
class ArrayRef {
public:
    using value_type = T;
    using pointer = value_type*;
    using const_pointer = const value_type*;
    using reference = value_type&;
    using const_reference = const value_type&;
    using iterator = const_pointer;
    using const_iterator = const_pointer;
    using reverse_iterator = std::reverse_iterator<iterator>;
    using const_reverse_iterator = std::reverse_iterator<const_iterator>;
    using size_type = size_t;
    using difference_type = ptrdiff_t;

private:
    /// The start of the array, in an external buffer.
    const T* Data = nullptr;

    /// The number of elements.
    size_type Length = 0;

public:
    /// @name Constructors
    /// @{

    /// Construct an empty ArrayRef.
    ArrayRef() = default;

    /// Construct an ArrayRef from a single element.
    ArrayRef(const T& OneElt)
        : Data(&OneElt), Length(1) {}

    /// Construct an ArrayRef from a pointer and length.
    ArrayRef(const T* data, size_t length)
        : Data(data), Length(length) {}

    iterator begin() const { return Data; }
    iterator end() const { return Data + Length; }

    reverse_iterator rbegin() const { return reverse_iterator(end()); }
    reverse_iterator rend() const { return reverse_iterator(begin()); }

    /// empty - Check if the array is empty.
    bool empty() const { return Length == 0; }

    const T* data() const { return Data; }

    /// size - Get the array size.
    size_t size() const { return Length; }

    /// front - Get the first element.
    const T& front() const {
        assert(!empty());
        return Data[0];
    }


};
class StringRef {
public:
    static constexpr size_t npos = ~size_t(0);

    using iterator = const char*;
    using const_iterator = const char*;
    using size_type = size_t;

private:
    /// The start of the string, in an external buffer.
    const char* Data = nullptr;

    /// The length of the string.
    size_t Length = 0;

    // Workaround memcmp issue with null pointers (undefined behavior)
    // by providing a specialized version
    static int compareMemory(const char* Lhs, const char* Rhs, size_t Length) {
        if (Length == 0) { return 0; }
        return ::memcmp(Lhs, Rhs, Length);
    }

public:
    /// @name Constructors
    /// @{

    /// Construct an empty string ref.
    /*implicit*/ StringRef() = default;

    /// Disable conversion from nullptr.  This prevents things like
    /// if (S == nullptr)
    StringRef(std::nullptr_t) = delete;

    /// Construct a string ref from a cstring.
    /*implicit*/ constexpr StringRef(const char* Str)
        : Data(Str), Length(Str ?
            // GCC 7 doesn't have constexpr char_traits. Fall back to __builtin_strlen.
#if defined(_GLIBCXX_RELEASE) && _GLIBCXX_RELEASE < 8
            __builtin_strlen(Str)
#else
            std::char_traits<char>::length(Str)
#endif
            : 0) {
    }

    /// Construct a string ref from a pointer and length.
    /*implicit*/ constexpr StringRef(const char* data, size_t length)
        : Data(data), Length(length) {}

    /// Construct a string ref from an std::string.
    /*implicit*/ StringRef(const std::string& Str)
        : Data(Str.data()), Length(Str.length()) {}

    /// Construct a string ref from an std::string_view.
    /*implicit*/ constexpr StringRef(std::string_view Str)
        : Data(Str.data()), Length(Str.size()) {}

    /// @}
    /// @name Iterators
    /// @{

    iterator begin() const { return Data; }

    iterator end() const { return Data + Length; }

    const unsigned char* bytes_begin() const {
        return reinterpret_cast<const unsigned char*>(begin());
    }
    const unsigned char* bytes_end() const {
        return reinterpret_cast<const unsigned char*>(end());
    }

    /// @}
    /// @name String Operations
    /// @{

    /// data - Get a pointer to the start of the string (which may not be null
    /// terminated).
    [[nodiscard]] const char* data() const { return Data; }

    /// empty - Check if the string is empty.
    [[nodiscard]] constexpr bool empty() const { return Length == 0; }

    /// size - Get the string size.
    [[nodiscard]] constexpr size_t size() const { return Length; }

    /// front - Get the first character in the string.
    [[nodiscard]] char front() const {
        assert(!empty());
        return Data[0];
    }

    /// back - Get the last character in the string.
    [[nodiscard]] char back() const {
        assert(!empty());
        return Data[Length - 1];
    }

    // copy - Allocate copy in Allocator and return StringRef to it.
    template <typename Allocator>
    [[nodiscard]] StringRef copy(Allocator& A) const {
        // Don't request a length 0 copy from the allocator.
        if (empty())
            return StringRef();
        char* S = A.template Allocate<char>(Length);
        std::copy(begin(), end(), S);
        return StringRef(S, Length);
    }

    /// equals - Check for string equality, this is more efficient than
    /// compare() when the relative ordering of inequal strings isn't needed.
    [[nodiscard]] bool equals(StringRef RHS) const {
        return (Length == RHS.Length &&
            compareMemory(Data, RHS.Data, RHS.Length) == 0);
    }

    /// compare - Compare two strings; the result is negative, zero, or positive
    /// if this string is lexicographically less than, equal to, or greater than
    /// the \p RHS.
    [[nodiscard]] int compare(StringRef RHS) const {
        // Check the prefix for a mismatch.
        if (int Res = compareMemory(Data, RHS.Data, std::min(Length, RHS.Length)))
            return Res < 0 ? -1 : 1;

        // Otherwise the prefixes match, so we only need to check the lengths.
        if (Length == RHS.Length)
            return 0;
        return Length < RHS.Length ? -1 : 1;
    }

    /// str - Get the contents as an std::string.
    [[nodiscard]] std::string str() const {
        if (!Data) return std::string();
        return std::string(Data, Length);
    }

    /// @}
    /// @name Operator Overloads
    /// @{

    [[nodiscard]] char operator[](size_t Index) const {
        assert(Index < Length && "Invalid index!");
        return Data[Index];
    }

    /// Disallow accidental assignment from a temporary std::string.
    ///
    /// The declaration here is extra complicated so that `stringRef = {}`
    /// and `stringRef = "abc"` continue to select the move assignment operator.
    template <typename T>
    std::enable_if_t<std::is_same<T, std::string>::value, StringRef>&
        operator=(T&& Str) = delete;

    /// @}
    /// @name Type Conversions
    /// @{

    operator std::string_view() const {
        return std::string_view(data(), size());
    }

    /// @}
    /// @name String Predicates
    /// @{

    /// Check if this string starts with the given \p Prefix.
    [[nodiscard]] bool starts_with(StringRef Prefix) const {
        return Length >= Prefix.Length &&
            compareMemory(Data, Prefix.Data, Prefix.Length) == 0;
    }
    [[nodiscard]] bool startswith(StringRef Prefix) const {
        return starts_with(Prefix);
    }

    /// Check if this string ends with the given \p Suffix.
    [[nodiscard]] bool ends_with(StringRef Suffix) const {
        return Length >= Suffix.Length &&
            compareMemory(end() - Suffix.Length, Suffix.Data, Suffix.Length) ==
            0;
    }
    [[nodiscard]] bool endswith(StringRef Suffix) const {
        return ends_with(Suffix);
    }
};

bool convertUTF16ToUTF8String(ArrayRef<char> SrcBytes, std::string& Out) {
    assert(Out.empty());

    // Error out on an uneven byte count.
    if (SrcBytes.size() % 2)
        return false;

    // Avoid OOB by returning early on empty input.
    if (SrcBytes.empty())
        return true;

    const UTF16* Src = reinterpret_cast<const UTF16*>(SrcBytes.begin());
    const UTF16* SrcEnd = reinterpret_cast<const UTF16*>(SrcBytes.end());

    assert((uintptr_t)Src % sizeof(UTF16) == 0);

    // Byteswap if necessary.
    std::vector<UTF16> ByteSwapped;
    if (Src[0] == UNI_UTF16_BYTE_ORDER_MARK_SWAPPED) {
        ByteSwapped.insert(ByteSwapped.end(), Src, SrcEnd);
        for (UTF16& I : ByteSwapped)
            I = llvm::ByteSwap_16(I);
        Src = &ByteSwapped[0];
        SrcEnd = &ByteSwapped[ByteSwapped.size() - 1] + 1;
    }

    // Skip the BOM for conversion.
    if (Src[0] == UNI_UTF16_BYTE_ORDER_MARK_NATIVE)
        Src++;

    // Just allocate enough space up front.  We'll shrink it later.  Allocate
    // enough that we can fit a null terminator without reallocating.
    Out.resize(SrcBytes.size() * UNI_MAX_UTF8_BYTES_PER_CODE_POINT + 1);
    UTF8* Dst = reinterpret_cast<UTF8*>(&Out[0]);
    UTF8* DstEnd = Dst + Out.size();

    ConversionResult CR =
        ConvertUTF16toUTF8(&Src, SrcEnd, &Dst, DstEnd, strictConversion);
    assert(CR != targetExhausted);

    if (CR != conversionOK) {
        Out.clear();
        return false;
    }

    Out.resize(reinterpret_cast<char*>(Dst) - &Out[0]);
    Out.push_back(0);
    Out.pop_back();
    return true;
}

bool convertUTF16ToUTF8String(ArrayRef<UTF16> Src, std::string& Out) {
    return convertUTF16ToUTF8String(
        llvm::ArrayRef<char>(reinterpret_cast<const char*>(Src.data()),
            Src.size() * sizeof(UTF16)),
        Out);
}
bool convertWideToUTF8(const std::wstring& Source, std::string& Result) {
    if (sizeof(wchar_t) == 1) {
        const UTF8* Start = reinterpret_cast<const UTF8*>(Source.data());
        const UTF8* End =
            reinterpret_cast<const UTF8*>(Source.data() + Source.size());
        if (!isLegalUTF8String(&Start, End))
            return false;
        Result.resize(Source.size());
        memcpy(&Result[0], Source.data(), Source.size());
        return true;
    }
    else if (sizeof(wchar_t) == 2) {
        return convertUTF16ToUTF8String(
            llvm::ArrayRef<UTF16>(reinterpret_cast<const UTF16*>(Source.data()),
                Source.size()),
            Result);
    }
    else if (sizeof(wchar_t) == 4) {
        const UTF32* Start = reinterpret_cast<const UTF32*>(Source.data());
        const UTF32* End =
            reinterpret_cast<const UTF32*>(Source.data() + Source.size());
        Result.resize(UNI_MAX_UTF8_BYTES_PER_CODE_POINT * Source.size());
        UTF8* ResultPtr = reinterpret_cast<UTF8*>(&Result[0]);
        UTF8* ResultEnd = reinterpret_cast<UTF8*>(&Result[0] + Result.size());
        if (ConvertUTF32toUTF8(&Start, End, &ResultPtr, ResultEnd,
            strictConversion) == conversionOK) {
            Result.resize(reinterpret_cast<char*>(ResultPtr) - &Result[0]);
            return true;
        }
        else {
            Result.clear();
            return false;
        }
    }
    else {
        //llvm_unreachable(
            //"Control should never reach this point; see static_assert further up");
    }

}

bool ConvertUTF8toWide(const char* Source, std::wstring& Result) {
    if (!Source) {
        Result.clear();
        return true;
    }
    return ConvertUTF8toWide(llvm::StringRef(Source), Result);
}
template <typename TResult>
static inline bool ConvertUTF8toWideInternal(llvm::StringRef Source,
    TResult& Result) {
    // Even in the case of UTF-16, the number of bytes in a UTF-8 string is
    // at least as large as the number of elements in the resulting wide
    // string, because surrogate pairs take at least 4 bytes in UTF-8.
    Result.resize(Source.size() + 1);
    char* ResultPtr = reinterpret_cast<char*>(&Result[0]);
    const UTF8* ErrorPtr;
    if (!ConvertUTF8toWide(sizeof(wchar_t), Source, ResultPtr, ErrorPtr)) {
        Result.clear();
        return false;
    }
    Result.resize(reinterpret_cast<wchar_t*>(ResultPtr) - &Result[0]);
    return true;
}
bool ConvertUTF8toWide(llvm::StringRef Source, std::wstring& Result) {
    return ConvertUTF8toWideInternal(Source, Result);
}
bool ConvertUTF8toWide(unsigned WideCharWidth, llvm::StringRef Source,
    char*& ResultPtr, const UTF8*& ErrorPtr) {
    //assert(WideCharWidth == 1 || WideCharWidth == 2 || WideCharWidth == 4);
    if (!(WideCharWidth == 1 || WideCharWidth == 2 || WideCharWidth == 4)) return false;

    ConversionResult result = conversionOK;
    // Copy the character span over.
    if (WideCharWidth == 1) {
        const UTF8* Pos = reinterpret_cast<const UTF8*>(Source.begin());
        if (!isLegalUTF8String(&Pos, reinterpret_cast<const UTF8*>(Source.end()))) {
            result = sourceIllegal;
            ErrorPtr = Pos;
        }
        else {
            memcpy(ResultPtr, Source.data(), Source.size());
            ResultPtr += Source.size();
        }
    }
    else if (WideCharWidth == 2) {
        const UTF8* sourceStart = (const UTF8*)Source.data();
        // FIXME: Make the type of the result buffer correct instead of
        // using reinterpret_cast.
        UTF16* targetStart = reinterpret_cast<UTF16*>(ResultPtr);
        ConversionFlags flags = strictConversion;
        result =
            ConvertUTF8toUTF16(&sourceStart, sourceStart + Source.size(),
                &targetStart, targetStart + Source.size(), flags);
        if (result == conversionOK)
            ResultPtr = reinterpret_cast<char*>(targetStart);
        else
            ErrorPtr = sourceStart;
    }
    else if (WideCharWidth == 4) {
        const UTF8* sourceStart = (const UTF8*)Source.data();
        // FIXME: Make the type of the result buffer correct instead of
        // using reinterpret_cast.
        UTF32* targetStart = reinterpret_cast<UTF32*>(ResultPtr);
        ConversionFlags flags = strictConversion;
        result =
            ConvertUTF8toUTF32(&sourceStart, sourceStart + Source.size(),
                &targetStart, targetStart + Source.size(), flags);
        if (result == conversionOK)
            ResultPtr = reinterpret_cast<char*>(targetStart);
        else
            ErrorPtr = sourceStart;
    }
    //assert((result != targetExhausted) &&
    //       "ConvertUTF8toUTFXX exhausted target buffer");
    return result == conversionOK;
}


// end

/* ---------------------------------------------------------------------

    Note A.
    The fall-through switches in UTF-8 reading code save a
    temp variable, some decrements & conditionals.  The switches
    are equivalent to the following loop:
        {
            int tmpBytesToRead = extraBytesToRead+1;
            do {
                ch += *source++;
                --tmpBytesToRead;
                if (tmpBytesToRead) ch <<= 6;
            } while (tmpBytesToRead > 0);
        }
    In UTF-8 writing code, the switches on "bytesToWrite" are
    similarly unrolled loops.

   --------------------------------------------------------------------- */

} // namespace llvm

ConvertUTF_RESTORE_WARNINGS
