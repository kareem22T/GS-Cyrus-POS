package com.anonymous.GSCyrusPOS.core.exception;

public class PrinterException extends Exception {

    public PrinterException() {
    }

    public PrinterException(String message) {
        super(message);
    }

    public PrinterException(String message, Throwable cause) {
        super(message, cause);
    }

    public PrinterException(Throwable cause) {
        super(cause);
    }
}

