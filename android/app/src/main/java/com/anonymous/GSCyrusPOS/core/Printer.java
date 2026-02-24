package com.anonymous.GSCyrusPOS.core;

import android.graphics.Bitmap;

import com.anonymous.GSCyrusPOS.core.PaxA930Printer.FontSize;

import java.io.InputStream;

public interface Printer {

    /**
     * The expected returning errors are:
     * 0  OK
     * 1  NO PAPER
     * 2  NO REACTION
     * 3  CHARACTERS LENGTH EXCEEDS 2048 BYTES
     * 4  LOW POWER
     * 5  FAILED TO GET STATUS
     * 6  FAILED TO GET STATUS
     * 7  OVERHEAT
     */

    void close() throws Throwable;

    /**
     * prints a text.
     *
     * @param text text to be printed
     * @throws Throwable if any error occurs while printing.
     */
    void printText(String text) throws Throwable;

    /**
     * prints a text.
     *
     * @param text text to be printed
     * @param bold indicates if text will be printed as bold
     * @throws Throwable if any error occurs while printing.
     */
    void printText(String text, boolean bold) throws Throwable;

    /**
     * prints a text.
     *
     * @param text     text to be printed
     * @param bold     indicates if text will be printed as bold
     * @param color    color of text in the form 0x00RRGGBB
     * @param fontSize font size of printed text
     * @throws Throwable if any error occurs while printing.
     */
    void printText(String text, boolean bold, int color, FontSize fontSize)
            throws Throwable;

    /**
     * prints a text.
     *
     * @param text     text to be printed
     * @param bold     indicates if text will be printed as bold
     * @param color    color of text in the form 0x00RRGGBB
     * @param fontSize color of text in the form 0x00RRGGBB
     * @param italic   indicates if text will be printed as italic or not
     * @throws Throwable
     */
    void printText(String text, boolean bold, int color, FontSize fontSize,
                   boolean italic) throws Throwable;

    /**
     * prints a text.
     *
     * @param text  text to be printed
     * @param bold  indicates if text will be printed as bold
     * @param color color of text in the form 0x00RRGGBB
     * @throws Throwable if any error occurs while printing.
     */
    void printText(String text, boolean bold, int color)
            throws Throwable;

    /**
     * @param alignment
     * @throws Throwable
     */
    void setAlignment(Alignment alignment) throws Throwable;

    /**
     * prints horizontal line. (not a line of text but a graphical line if
     * supported).
     *
     * @throws Throwable if any error occurs while printing.
     */
    void printHorizontalLine() throws Throwable;

    /**
     * prints horizontal underline.(a line of Underscores)
     *
     * @throws Throwable if any error occurs while printing.
     */
    void printHorizontalUnderLines() throws Throwable;

    /**
     * prints a tabular data.
     *
     * @param tableData    2d string array containing data to be printed
     * @param hasHeaderRow indicates if first row should be treated specially as header
     *                     or not.
     * @throws Throwable if any error occurs while printing.
     */
    void printTable(String[][] tableData, boolean hasHeaderRow)
            throws Throwable;

    /**
     * flushes printer buffer and causes an pending data to be printed out.
     * NOTE: this method ends currently printed line.
     *
     * @throws Throwable if any error occurs while printing.
     */
    void flush() throws Throwable;

    /**
     * prints an bitmap
     *
     * @param bitmap bitmap to be printed
     * @throws Throwable if any error occurs while printing.
     */
    void printLogo(Bitmap bitmap) throws Throwable;

    /**
     * prints an bitmap
     *
     * @param bitmap bitmap to be printed
     * @throws Throwable if any error occurs while printing.
     */
    void printImage(Bitmap bitmap) throws Throwable;

    /**
     * prints an image
     *
     * @param inputStream image to be printed
     * @throws Throwable if any error occurs while printing.
     */
    void printImage(InputStream inputStream) throws Throwable;

    /**
     * prints a labeled data. general form will be "label:........data" but
     * implementations may choose to implement in another way as suitable.
     *
     * @param label label of data
     * @param data  data to be printed.
     * @throws Throwable if any error occurs while printing.
     */
    void printLabeledData(String label, String data) throws Throwable;

    /**
     * prints a labeled data. general form will be "label:........data" but
     * implementations may choose to implement in another way as suitable.
     *
     * @param label label of data
     * @param data  data to be printed.
     * @param bold  to print the text with bold effect
     * @throws Throwable if any error occurs while printing.
     */
    void printLabeledData(String label, String data, boolean bold) throws Throwable;

    void printLabeledData(String label, String data, boolean bold, char separator)
            throws Throwable;

    /**
     * check the status of printer is ready for printing or not it will throw
     * exception according to type of error
     *
     * @throws Throwable
     */
    void ensurePrinterStatusIsReady() throws Throwable;

    /**
     * prints horizontal line of Stars. (not a line of text but a graphical line
     * of stars if supported).
     *
     * @throws Throwable if any error occurs while printing.
     */
    void printHorizontalLineOfStars() throws Throwable;

    /*
     * return line width of paper that each printer print on it
     */
    int getLineWidth();

    /*
     * to clear the buffer of printer just in case printer is out of paper some
     * data are already written to the buffer of the printer and the printer
     * doesn't print it
     */
    void clearBufferOfPrinter() throws Throwable;

    void openConnection() throws Throwable;

    void addToPrint(boolean isLastBlock);

    void clearData();

    enum Alignment {
        LEFT,
        RIGHT,
        CENTER
    }

}