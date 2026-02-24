package com.anonymous.GSCyrusPOS.core.exception;

public class PaperlessPrinterException extends PrinterException{

    public PaperlessPrinterException() {
    }

    public PaperlessPrinterException(String message) {
        super(message);
    }

    public PaperlessPrinterException(String message, Throwable cause) {
        super(message, cause);
    }

    public PaperlessPrinterException(Throwable cause) {
        super(cause);
    }
}
