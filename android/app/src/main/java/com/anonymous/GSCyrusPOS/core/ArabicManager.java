/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package com.anonymous.GSCyrusPOS.core;

import android.annotation.SuppressLint;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Hashtable;

/**
 * used to detect if ita arabic word or not
 *
 * @author maramh
 */
public class ArabicManager {

    static final char TABLE_LINE_START = '\u007C';
    static final char TABLE_LINE_END = '\u007C';
    private static final char[] NON_lINKED_CHAR = {'\u0632', '\u0631',
            '\u0627', '\u0623', '\u062f', '\u0630', '\u0648', '\u0624',
            '\u0625', '\u0622'};
    private static final char[] SEPERATORS = {'\u061C', ' ', '\t', '\r', '\n',
            TABLE_LINE_START, TABLE_LINE_END, ',', ')', '(', '-', ':', '*'};
    private static Hashtable<Character, int[]>/* <arabic character, UTF-8[]> */CHAR_MAPPING;
    // indexes of array sotred in hashtable
    private static int ARABIC_CHAR_FORM_PREFIX = 1;
    private static int ARABIC_CHAR_FORM_INFIX = 0;
    private static int ARABIC_CHAR_FORM_POSTFIX = 2;
    private static int ARABIC_CHAR_FORM_STANDALONE = 3;

    @SuppressLint("UseValueOf")
    @SuppressWarnings({"unchecked", "rawtypes"})
    static void fillCharaMap() {

        CHAR_MAPPING = new Hashtable();
        CHAR_MAPPING.put(new Character('\u0621'), new int[]{65152, 65152,
                65152, 65152}); // Hamza
        CHAR_MAPPING.put(new Character('\u0622'), new int[]{65154, 65153,
                65154, 65153});
        CHAR_MAPPING.put(new Character('\u0623'), new int[]{65156, 65155,
                65156, 65155});
        CHAR_MAPPING.put(new Character('\u0624'), new int[]{65158, 65157,
                65158, 65157});
        CHAR_MAPPING.put(new Character('\u0625'), new int[]{65160, 65159,
                65160, 65159});
        CHAR_MAPPING.put(new Character('\u0626'), new int[]{65164, 65163,
                65162, 65161});
        CHAR_MAPPING.put(new Character('\u0627'), new int[]{65166, 65165,
                65166, 65165});
        CHAR_MAPPING.put(new Character('\u0628'), new int[]{65170, 65169,
                65168, 65167});
        CHAR_MAPPING.put(new Character('\u0629'), new int[]{65176, 65175,
                65172, 65171});
        CHAR_MAPPING.put(new Character('\u062a'), new int[]{65176, 65175,
                65174, 65173});
        CHAR_MAPPING.put(new Character('\u062b'), new int[]{65180, 65179,
                65178, 65177});
        CHAR_MAPPING.put(new Character('\u062c'), new int[]{65184, 65183,
                65182, 65181});
        CHAR_MAPPING.put(new Character('\u062d'), new int[]{65188, 65187,
                65186, 65185});
        CHAR_MAPPING.put(new Character('\u062e'), new int[]{65192, 65191,
                65190, 65189});
        CHAR_MAPPING.put(new Character('\u062f'), new int[]{65194, 65193,
                65194, 65193});
        CHAR_MAPPING.put(new Character('\u0630'), new int[]{65196, 65195,
                65196, 65195});
        CHAR_MAPPING.put(new Character('\u0631'), new int[]{65198, 65197,
                65198, 65197});
        CHAR_MAPPING.put(new Character('\u0632'), new int[]{65200, 65199,
                65200, 65199});
        CHAR_MAPPING.put(new Character('\u0633'), new int[]{65204, 65203,
                65202, 65201});
        CHAR_MAPPING.put(new Character('\u0634'), new int[]{65208, 65207,
                65206, 65205});
        CHAR_MAPPING.put(new Character('\u0635'), new int[]{65212, 65211,
                65210, 65209});
        CHAR_MAPPING.put(new Character('\u0636'), new int[]{65216, 65215,
                65214, 65213});
        CHAR_MAPPING.put(new Character('\u0637'), new int[]{65220, 65219,
                65218, 65217});
        CHAR_MAPPING.put(new Character('\u0638'), new int[]{65224, 65223,
                65222, 65221});
        CHAR_MAPPING.put(new Character('\u0639'), new int[]{65228, 65227,
                65226, 65225});
        CHAR_MAPPING.put(new Character('\u063a'), new int[]{65232, 65231,
                65230, 65229});
        CHAR_MAPPING.put(new Character('\u0641'), new int[]{65236, 65235,
                65234, 65233});
        CHAR_MAPPING.put(new Character('\u0642'), new int[]{65240, 65239,
                65238, 65237});
        CHAR_MAPPING.put(new Character('\u0643'), new int[]{65244, 65243,
                65242, 65241});
        CHAR_MAPPING.put(new Character('\u0644'), new int[]{65248, 65247,
                65246, 65245});
        CHAR_MAPPING.put(new Character('\u0645'), new int[]{65252, 65251,
                65250, 65249});
        CHAR_MAPPING.put(new Character('\u0646'), new int[]{65256, 65255,
                65254, 65253});
        CHAR_MAPPING.put(new Character('\u0647'), new int[]{65260, 65259,
                65258, 65257});
        CHAR_MAPPING.put(new Character('\u0648'), new int[]{65261, 65262,
                65262, 65261});
        CHAR_MAPPING.put(new Character('\u0649'), new int[]{65263, 65264,
                65264, 65263});
        CHAR_MAPPING.put(new Character('\u064a'), new int[]{65268, 65267,
                65266, 65265});

    }

    static boolean isArabicWord(String text) {
        if (CHAR_MAPPING == null) {
            fillCharaMap();
        }
        boolean isArabic = false;
        char[] textCharArray = text.toCharArray();
        for (int i = 0; i < textCharArray.length; i++) {
            if (CHAR_MAPPING.containsKey(Character.valueOf(textCharArray[i]))) {
                isArabic = true;
                break;
            }
        }
        return isArabic;
    }

    /**
     * return the bytes of the char using utf - 8
     *
     * @param str    the whole line to et the correct position of char(if its
     *               arabic char)
     * @param letter the char to be converted to byte array
     * @param index  the position of the char in the line
     * @return byte array of the letter
     * @throws UnsupportedEncodingException
     * @throws IOException
     */
    @SuppressLint("UseValueOf")
    static byte[] encodeArabicWordToFormB(String str, char letter,
                                          int index) throws UnsupportedEncodingException, IOException {
        ByteArrayOutputStream outStream = new ByteArrayOutputStream();
        OutputStreamWriter streamWriter = new OutputStreamWriter(outStream,
                StandardCharsets.UTF_8);
        // for (int i = 0; i < str.length(); i++) {
        Character currentChar = new Character(letter);
        if (CHAR_MAPPING.containsKey(currentChar)) {
            int curForm = getArabicPositionForIndex(str, index);
            int[] forms = CHAR_MAPPING.get(currentChar);
            streamWriter.write(forms[curForm]);

        } else {
            streamWriter.write(currentChar.charValue());
        }
        // }
        streamWriter.flush();
        streamWriter.close();
        return outStream.toByteArray();
    }

    private static boolean isNonLinkedChar(char aChar) {
        for (int i = 0; i < NON_lINKED_CHAR.length; ++i) {
            if (aChar == NON_lINKED_CHAR[i]) {
                return true;
            }
        }
        return false;
    }

    static boolean isArabicLetter(char letter) {
        return (CHAR_MAPPING.containsKey(new Character(letter)));
    }

    /**
     * get the correct form of the arabic char in the word,
     *
     * @param str   the arabic word
     * @param index index of the char in the arabic word
     * @return FORM_PREFIX = 1; or FORM_INFIX = 0; or FORM_POSTFIX = 2; or
     * FORM_STANDALONE = 3;
     */
    @SuppressLint("UseValueOf")
    private static int getArabicPositionForIndex(String str, int index) {
        // Character currentChar = str.charAt(index);

        Character nextChar = index < str.length() - 1 ? new Character(
                str.charAt(index + 1)) : null;
        Character prevChar = index > 0 ? new Character(str.charAt(index - 1))
                : null;

        boolean nextCharIsWhiteSpace = nextChar == null
                || isSeperator(nextChar.charValue()); // TODO:: calculate this
        // value
        boolean prevCharIsWhiteSpace = prevChar == null
                || isSeperator(prevChar.charValue())
                || isNonLinkedChar(prevChar.charValue()); // TODO:: calculate
        // this value

        if (nextCharIsWhiteSpace && prevCharIsWhiteSpace) {
            return ARABIC_CHAR_FORM_STANDALONE;
        } else if (!nextCharIsWhiteSpace && !prevCharIsWhiteSpace) {
            return ARABIC_CHAR_FORM_INFIX;
        } else if (nextCharIsWhiteSpace) {
            return ARABIC_CHAR_FORM_POSTFIX;
        } else if (prevCharIsWhiteSpace) {
            return ARABIC_CHAR_FORM_PREFIX;
        }

        throw new RuntimeException(
                "@getArabicPositionForIndex Undefined character form");
    }

    static boolean isSeperator(char aChar) {
        for (int i = 0; i < SEPERATORS.length; i++) {
            if (aChar == SEPERATORS[i]) {
                return true;
            }
        }
        return false;
    }

}
