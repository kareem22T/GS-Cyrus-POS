package com.anonymous.GSCyrusPOS.core;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.text.TextUtils;
import android.util.Log;

import com.anonymous.GSCyrusPOS.R;
import com.anonymous.GSCyrusPOS.core.exception.CannotConnectPrinterException;
import com.anonymous.GSCyrusPOS.core.exception.PaperlessPrinterException;
import com.anonymous.GSCyrusPOS.core.exception.TextPrintingFailurePrinterException;
import com.anonymous.GSCyrusPOS.core.exception.TooHotPrinterException;
import com.pax.dal.IDAL;
import com.pax.dal.IPrinter;
import com.pax.dal.entity.EFontTypeAscii;
import com.pax.dal.entity.EFontTypeExtCode;
import com.pax.dal.exceptions.PrinterDevException;
import com.pax.gl.page.IPage;
import com.pax.gl.page.PaxGLPage;
import com.pax.neptunelite.api.NeptuneLiteUser;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;

public class PaxA930Printer implements Printer {

    public static final int PRINTER_STATUS_CODE_OK = 0;
    public static final int PRINTER_STATUS_CODE_NO_PAPER = 2;
    public static final int PRINTER_STATUS_CODE_OVERHEAT = 8;
    public static final int PRINTER_STATUS_CODE_PRINTING_FAILED = 240;

    private final static String TAG = PaxA930Printer.class.getSimpleName();

    // contains some dash line beside each other
    private static final String LINE_STEING;
    // contains some Stars beside each other
    private static final String LINE_STARS;
    private static final String LINE_UNDERSCORE;

    static {
        StringBuilder lineString = new StringBuilder();
        StringBuilder starString = new StringBuilder();
        int lineWidth = FontSize.SMALL.getLineWidth(Locale.getDefault() == Locale.ENGLISH ? Local.ENGLISH : Local.ARABIC);
        for (int i = 0; i < lineWidth + 28; i++) {
            lineString.append("-");
        }
        for (int i = 0; i < lineWidth; i++) {
            starString.append("*");
        }
        LINE_STEING = lineString.toString();
        LINE_STARS = starString.toString();

        lineString = new StringBuilder();
        for (int i = 0; i < lineWidth; i++) {
            lineString.append("_");
        }
        LINE_UNDERSCORE = lineString.toString();
        // to fill the hashtable of the arabic letters
        ArabicManager.fillCharaMap();
    }

    private final Context context;
    private final PrinterListener printerListener;
    private final HashMap<Integer, List<PrintText>> dataHashMap = new HashMap<>();
    private BlockFinishedPrintingListener blockFinishedPrintingListener;
    private List<PrintText> dataToPrintList = new ArrayList<>();
    private String dataToPrint;
    private boolean hasOngoingOperation = false;
    private boolean failed = false;
    // the current alignment of printing (left , right , middle)
    private Alignment alignment;
    private int currentBlock = 1;
    private IPrinter printer;

    public PaxA930Printer(Context context, PrinterListener printerListener) {
        this.context = context;
        this.printerListener = printerListener;
    }

    @Override
    public void close() throws Throwable {
        this.addToPrint(true);
        this.clearData();
    }

    @Override
    public void printText(String text) throws Throwable {
        printText(text, false, 0x0000ff, FontSize.SMALL);
    }

    @Override
    public void printText(String text, boolean bold) throws Throwable {
        printText(text, bold, 0x0000ff, FontSize.SMALL);
    }

    @Override
    public void printText(String text, boolean bold, int color, FontSize fontSize) throws Throwable {
        if (TextUtils.isEmpty(text)) return;
        printText(text, bold, color, fontSize, false);
    }

//    @Override
//    public void printLongText(String text, boolean bold, int color, FontSize fontSize) throws Throwable {
//        if (TextUtils.isEmpty(text)) return;
//        String longText = printLargeText(text, getLineWidth(fontSize));
//        printText(longText, bold, color, fontSize, false);
//    }

    @Override
    public void printText(String text, boolean bold, int color, FontSize fontSize,
                          boolean italic) throws Throwable {
        if (TextUtils.isEmpty(text)) return;

        PaxGLPage iPaxGLPage = PaxGLPage.getInstance(this.context);
        IPage page = iPaxGLPage.createPage();

        Local local = this.detectLanguage(text);

        if (this.dataToPrint == null) this.dataToPrint = "";

        Alignment selectedAlignment = this.alignment;
        if (selectedAlignment == null) {
            //PAX printer internally check the chars alignment so by default take care of RTL and LTR
            selectedAlignment = Alignment.LEFT;
        }
        int size = bold ? fontSize.getFontSize(local) - 1 : fontSize.getFontSize(local);
        int lineWidth = fontSize.getLineWidth(local);

        if (text.length() > lineWidth) {
            boolean isLettersAndDigitsOnly = this.endsWithLettersAndDigitsOnly(text);
            if (isLettersAndDigitsOnly) {
                String[] lines = divideTextToLines(text, lineWidth);
                for (String line : lines) {
                    line = line.replaceAll("\uffff", "  ");
                    page.addLine().addUnit(line, size, getAlignment(selectedAlignment), getBoldCode(bold));
                }
                PrintText data = new PrintText(page);
                dataToPrintList.add(data);
            } else {
                text = text.replaceAll("\uffff", "  ");
                page.addLine().addUnit(text, size, getAlignment(selectedAlignment), getBoldCode(bold));
                PrintText data = new PrintText(page);
                dataToPrintList.add(data);
            }
        } else {
            text = text.replaceAll("\uffff", "  ");
            page.addLine().addUnit(text, size, getAlignment(selectedAlignment), getBoldCode(bold));
            PrintText data = new PrintText(page);
            dataToPrintList.add(data);
        }

        Log.d(TAG, "printtext Called and list size is " + dataToPrintList.size());
    }

    private boolean endsWithLettersAndDigitsOnly(String text) {
        if (TextUtils.isEmpty(text)) return true;
        String trimText = text.trim();
        char c = trimText.charAt(trimText.length() - 1);
        return this.isLetterOrDigitOnly(c);
    }

    private boolean isLettersAndDigitsOnly(String text) {
        boolean isLettersAndDigitsOnly = true;
        for (int i = 0; i < text.length(); i++) {
            if (this.isLetterOrDigitOnly(text.charAt(i))) continue;
            isLettersAndDigitsOnly = false;
            break;
        }
        return isLettersAndDigitsOnly;
    }

    private boolean isLetterOrDigitOnly(char c) {
        if (c == '.') return true;
        if (c == ',') return true;
        if (c == '،') return true;
        if (c == ')') return true;
        if (c == '(') return true;
        if (ArabicManager.isArabicLetter(c)) return true;
        if (!Character.isLetterOrDigit(c)) return false;
        return c != '-' && c != '*';
    }

    @Override
    public void printText(String text, boolean bold, int color) throws Throwable {
        if (TextUtils.isEmpty(text)) return;
        this.printText(text, bold, color, FontSize.SMALL);
    }

    @Override
    public void setAlignment(Alignment alignment) throws Throwable {
        this.alignment = alignment;
    }

    @Override
    public void printHorizontalLine() throws Throwable {
        this.setAlignment(Alignment.CENTER);
        this.printText(LINE_STEING);
        this.setAlignment(this.alignment);
    }

    @Override
    public void printHorizontalUnderLines() throws Throwable {
        Alignment oldAlignment = this.alignment;
        this.alignment = Alignment.CENTER;
        this.printText(LINE_UNDERSCORE);
        this.setAlignment(oldAlignment);
    }

    @Override
    public void printTable(String[][] tableData, boolean hasHeaderRow) throws Throwable {
    }

    @Override
    public void flush() throws Throwable {
        dataToPrintList = null;
    }

    @Override
    public void printLogo(Bitmap bitmap) throws Throwable {
        this.setAlignment(Alignment.CENTER);
        this.printImage(bitmap);
    }

    @Override
    public void printImage(Bitmap bitmap) throws Throwable {
        PrintText data = new PrintText(bitmap);
        dataToPrintList.add(data);
    }

    @Override
    public void printImage(InputStream inputStream) throws Throwable {
        printImage(BitmapFactory.decodeStream(inputStream));
    }

    @Override
    public void printLabeledData(String label, String data) throws Throwable {
        printLabeledData(label, data, false);
    }

    @Override
    public void printLabeledData(String label, String data, boolean bold) throws Throwable {
        printLabeledData(label, data, bold, '-');
    }

    @Override
    public void printLabeledData(String label, String data, boolean bold, char separator) throws Throwable {
        if (TextUtils.isEmpty(label) && TextUtils.isEmpty(data)) return;
        label = label == null ? "" : label.trim();
        data = data == null ? "" : data.trim();

        // get the length of all printed line
        PaxGLPage iPaxGLPage = PaxGLPage.getInstance(this.context);
        IPage page = iPaxGLPage.createPage();

        PrintText text;
        Local local = this.detectLanguage(label);
        FontSize fontSize;
        if (bold) {
            fontSize = FontSize.LARGE; // -1
        } else {
            fontSize = FontSize.SMALL;
        }

        int labelLength = label.length();
        int dataLength = data.length();
        int fontSizeValue = fontSize.getFontSize(local) - (bold ? 1 : 0);
        int halfLine = fontSize.getLineWidth(local) / 2;
        if (labelLength <= halfLine && dataLength <= halfLine) {
            IPage.ILine line1 = page.addLine();
            IPage.ILine.IUnit dataUnit = page.createUnit();
            IPage.ILine.IUnit labelUnit = page.createUnit();
            if (local == Local.ARABIC) {
                IPage.EAlign direction = IPage.EAlign.LEFT;
                if (detectLanguage(data) == Local.ARABIC) {
                    direction = IPage.EAlign.RIGHT;
                }
                dataUnit.setAlign(direction).setText(data).setFontSize(fontSizeValue);
                line1.addUnit(dataUnit);
                labelUnit.setAlign(IPage.EAlign.LEFT).setText(label).setFontSize(fontSizeValue);
                line1.addUnit(labelUnit);
            } else {
                labelUnit.setAlign(IPage.EAlign.LEFT).setText(label).setFontSize(fontSizeValue);
                line1.addUnit(labelUnit);
                IPage.EAlign direction = IPage.EAlign.RIGHT;
                if (detectLanguage(data) == Local.ARABIC) {
                    direction = IPage.EAlign.LEFT;
                }
                dataUnit.setAlign(direction).setText(data).setFontSize(fontSizeValue);
                line1.addUnit(dataUnit);
            }
        } else {
            IPage.ILine.IUnit labelUnit = page.createUnit();
            IPage.ILine.IUnit dataUnit = page.createUnit();
            IPage.ILine line1 = page.addLine();
            IPage.ILine line2 = page.addLine();
            if (local == Local.ARABIC) {
                labelUnit.setAlign(IPage.EAlign.LEFT).setText(label).setFontSize(fontSizeValue);
                dataUnit.setAlign(IPage.EAlign.LEFT).setText(data).setFontSize(fontSizeValue);
            } else {
                labelUnit.setAlign(IPage.EAlign.LEFT).setText(label).setFontSize(fontSizeValue);
                dataUnit.setAlign(IPage.EAlign.RIGHT).setText(data).setFontSize(fontSizeValue);
            }
            line1.addUnit(labelUnit);
            line2.addUnit(dataUnit);
        }
        text = new PrintText(page);
        this.dataToPrintList.add(text);
    }


    private Local detectLanguage(String label) {
        if (label == null)
            return (Locale.getDefault() == Locale.ENGLISH) ? Local.ENGLISH : Local.ARABIC;
        // check the char is arabic or not to change the direction
        for (char c : label.toCharArray()) {
            if (ArabicManager.isArabicLetter(c)) {
                return Local.ARABIC;
            }
        }
        return Local.ENGLISH;
    }

    @Override
    public void ensurePrinterStatusIsReady() {
    }

    @Override
    public void printHorizontalLineOfStars() throws Throwable {
        this.setAlignment(Alignment.CENTER);
        this.printText(LINE_STARS);
        this.setAlignment(this.alignment);
    }

    @Override
    public int getLineWidth() {
        boolean isEnglish = Locale.getDefault() == Locale.ENGLISH;
        return FontSize.SMALL.getLineWidth(isEnglish ? Local.ENGLISH : Local.ARABIC);
    }

    @Override
    public void clearBufferOfPrinter() {
    }

    @Override
    public void openConnection() throws Throwable {
        IDAL deviceEngine = this.getDeviceEngine();
        if (deviceEngine == null) return;

        this.printer = deviceEngine.getPrinter();
        if (this.printer == null) return;

        this.initializePrinter();
    }

    @Override
    public void addToPrint(boolean isLastBlock) {
        this.initializePrinter();
        List<PrintText> blockedData = new ArrayList<>(dataToPrintList);
        dataToPrintList = new ArrayList<>();
        dataHashMap.clear();
        dataHashMap.put(1, blockedData);
        startPrinting(isLastBlock);
    }

    @Override
    public void clearData() {
        this.dataToPrint = "";
        this.currentBlock = 1;
    }

    private void initializePrinter() {
        try {
            this.printer.init();
            this.printer.fontSet(EFontTypeAscii.FONT_16_16, EFontTypeExtCode.FONT_16_16);
            this.printer.setGray(3);
        } catch (PrinterDevException e) {
            Log.w(TAG, "Failed to initialize the Pax printer", e);
            Throwable contextException = new CannotConnectPrinterException(e);
            if (this.printerListener == null) return;
            this.printerListener.printingFailWithException(contextException);
        }
    }

    private void handlePrinterStatus(int status) {
        Throwable exception;
        switch (status) {
            case PRINTER_STATUS_CODE_OK:
                return;
            case PRINTER_STATUS_CODE_NO_PAPER:
                String errorMessage = this.context.getString(R.string.PRINTER_ERROR_PAPERLESS);
                exception = new PaperlessPrinterException(errorMessage);
                break;
            case PRINTER_STATUS_CODE_OVERHEAT:
                errorMessage = this.context.getString(R.string.PRINTER_TOO_HOT);
                exception = new TooHotPrinterException(errorMessage);
                break;
            default:
                // General error
                errorMessage = this.context.getString(R.string.PRINTER_ERROR_GENERAL);
                exception = new TextPrintingFailurePrinterException(errorMessage);
                break;
        }
        Log.d(TAG, "Status: " + status);
        this.failed = true;
        this.printerListener.printingFailWithException(exception);
    }

    private boolean prepareDataToPrint() throws Throwable {
        List<PrintText> data = this.dataHashMap.get(1);
        if (data == null || data.isEmpty()) return false;
        for (PrintText text : data) {
            if (text.getIPage() != null) {
                printAsImg(text.getIPage());
                continue;
            }
            if (text.getBitMap() != null) {
                this.printBitMap(text.getBitMap());
                continue;
            }
            return false;
        }
        return true;
    }

    private void startPrinting(boolean isLastBlock) {
        if (hasOngoingOperation) return;
        startPrintingProcess(isLastBlock);
    }

    private void printAsImg(IPage page) throws Throwable {
        PaxGLPage iPaxGLPage = PaxGLPage.getInstance(this.context);
        ////////////////////////
        int width = 348;
        Bitmap bitmap = iPaxGLPage.pageToBitmap(page, width);
        ////////////////////////
        this.printBitMap(bitmap);
    }

    private void printBitMap(Bitmap bitmap) throws Throwable {
        int leftIndent = (390 - bitmap.getWidth()) / 2;
        if (leftIndent < 0) leftIndent = 0;
        this.printer.leftIndent(leftIndent);
        if (leftIndent > 0) {
            this.printer.printBitmap(bitmap);
        } else {
            this.printer.printBitmapWithMonoThreshold(bitmap, 220);
        }
    }

    private void startPrintingProcess(final boolean isLastBlock) {
        if (this.failed) return;
        this.hasOngoingOperation = true;
        // Only start printing if no other ongoing printing operations
        int status;
        boolean isDataAppendedToPrint;
        try {
            isDataAppendedToPrint = this.prepareDataToPrint();
        } catch (Throwable e) {
            e.printStackTrace();
            this.handleStatus();
            return;
        }
        Log.d(TAG, "before start print inside Stating printing process");
        if (!isDataAppendedToPrint) {
            this.hasOngoingOperation = false;
            this.currentBlock++;
            this.continuePrinting();
            return;
        }
        try {
            status = this.printer.start();
            if (isLastBlock && status == PRINTER_STATUS_CODE_OK) {
                this.initializePrinter();
                this.printer.step(60);
                this.printer.start();
            }
        } catch (Throwable e) {
            e.printStackTrace();
            try {
                status = printer.getStatus();
            } catch (Throwable ex) {
                ex.printStackTrace();
                status = PRINTER_STATUS_CODE_PRINTING_FAILED;
            }
        }

        Log.d(TAG, "inside on print result status is " + status);
        this.hasOngoingOperation = false;
        if (status != PRINTER_STATUS_CODE_OK) {
            this.handlePrinterStatus(status);
            return;
        }
        if (isLastBlock) {
            this.showPrintedSuccessfullyMessage();
        }
        this.notifyResultForStartedPrinting(status);
    }

    private void handleStatus() {
        try {
            int status = this.printer.getStatus();
            this.handlePrinterStatus(status);
        } catch (Throwable ex) {
            ex.printStackTrace();
            this.handlePrinterStatus(PRINTER_STATUS_CODE_PRINTING_FAILED);
        }
    }

    private void continuePrinting() {
        Log.d(TAG, "inside continuous printing current block is " + currentBlock);
        Log.d(TAG, "inside continuous printing size of hashmap is " + dataHashMap.size());
        this.startPrinting(currentBlock == dataHashMap.size());
    }

    private void showPrintedSuccessfullyMessage() {
        this.printerListener.onFinishDocumentPrinting();
    }

    private String[] divideTextToLines(String text, int lineWidth) {
        List<String> lines = new ArrayList<>();
        int startIndex = 0;
        int endIndex;
        String line;
        boolean addDash = false;
        do {
            endIndex = startIndex + lineWidth;
            // if remaining text doesn't fill a line take it all.
            if (endIndex > text.length()) {
                endIndex = text.length();
            } // else search for first seperator to end the line.
            else if (endIndex < text.length()) {
                while (endIndex > startIndex
                        && !ArabicManager.isSeperator(text.charAt(endIndex))) {
                    --endIndex;
                }
                if (endIndex <= startIndex || (endIndex - startIndex) < (lineWidth * 2 / 3)) {
                    endIndex = startIndex + lineWidth - 1;
                    addDash = true;
                }
            }
            line = text.substring(startIndex, endIndex);
            if (addDash) {
                line += "-";
                addDash = false;
            }
            lines.add(line);
            startIndex = endIndex;
            if (startIndex < text.length() && text.charAt(startIndex) == ' ') {
                ++startIndex;
            }
        } while (endIndex < text.length());
        String[] lineArray = new String[lines.size()];
        for (int i = 0; i < lineArray.length; ++i) {
            lineArray[i] = lines.get(i);
        }
        return lineArray;
    }

    public void notifyResultForStartedPrinting(int result) {
        Log.d(TAG, "Notified Result: " + result);
        if (this.blockFinishedPrintingListener == null) return;
        blockFinishedPrintingListener.notifyBlockFinishedPrinting(currentBlock - 1);
    }

    public void registerBlockFinishedPrinter(
            BlockFinishedPrintingListener blockFinishedPrintingListener) {
        this.blockFinishedPrintingListener = blockFinishedPrintingListener;
    }

    private IDAL getDeviceEngine() {
        try {
            return NeptuneLiteUser.getInstance().getDal(this.context);
        } catch (Exception e) {
            Log.w(TAG, "Failed to initialize Pax device engine", e);
            Throwable contextException = new CannotConnectPrinterException(e);
            if (this.printerListener != null) {
                this.printerListener.printingFailWithException(contextException);
            }
            return null;
        }
    }

    private int getBoldCode(boolean isBold) {
        return isBold ? IPage.ILine.IUnit.TEXT_STYLE_BOLD : IPage.ILine.IUnit.TEXT_STYLE_NORMAL;
    }

    private IPage.EAlign getAlignment(Alignment selectedAlign) {
        switch (selectedAlign) {
            case LEFT:
                return IPage.EAlign.LEFT;
            case RIGHT:
                return IPage.EAlign.RIGHT;
            case CENTER:
            default:
                return IPage.EAlign.CENTER;
        }
    }

    public enum FontSize {
        SMALL(16, 39, 19, 36),
        MEDIUM(24, 27, 24, 27),
        LARGE(27, 30, 30, 20);

        private final int fontSizeAr;
        private final int fontSizeEn;
        private final int lineWidthAr;
        private final int lineWidthEn;

        FontSize(int fontSizeAr, int lineWidthAr, int fontSizeEn, int lineWidthEn) {
            this.fontSizeAr = fontSizeAr;
            this.lineWidthAr = lineWidthAr;
            this.fontSizeEn = fontSizeEn;
            this.lineWidthEn = lineWidthEn;
        }

        int getFontSize(Local local) {
            if (local == Local.ARABIC) return this.fontSizeAr;
            return this.fontSizeEn;
        }

        int getLineWidth(Local local) {
            if (local == Local.ARABIC) return this.lineWidthAr;
            return this.lineWidthEn;
        }
    }

    public enum Local {ENGLISH, ARABIC}
}