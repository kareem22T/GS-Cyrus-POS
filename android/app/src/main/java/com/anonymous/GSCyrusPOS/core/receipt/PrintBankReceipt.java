package com.anonymous.GSCyrusPOS.core.receipt;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import com.anonymous.GSCyrusPOS.R;
import com.anonymous.GSCyrusPOS.core.BlockFinishedPrintingListener;
import com.anonymous.GSCyrusPOS.core.PaxA930Printer;
import com.anonymous.GSCyrusPOS.core.PaxA930Printer.FontSize;
import com.anonymous.GSCyrusPOS.core.Printer;
import com.anonymous.GSCyrusPOS.core.PrinterListener;

public class PrintBankReceipt {

    private final Context context;
    private final BankReceipt bankReceipt;

    public PrintBankReceipt(
            Context context,
            BankReceipt bankReceipt) {
        this.context = context;
        this.bankReceipt = bankReceipt;
    }

    public void print(PrinterListener printerListener,
                      BlockFinishedPrintingListener blockFinishedPrintingListener) throws Throwable {
        PaxA930Printer paxPrinter = new PaxA930Printer(this.context, printerListener);
        paxPrinter.openConnection();
        paxPrinter.registerBlockFinishedPrinter(blockFinishedPrintingListener);
        paxPrinter.clearData();
        Bitmap nbeLogoBitmap = BitmapFactory.decodeResource(this.context.getResources(), R.drawable.logo_nbe);
        paxPrinter.setAlignment(Printer.Alignment.CENTER);
        paxPrinter.printImage(nbeLogoBitmap);
        paxPrinter.printText(this.bankReceipt.getReceiptHeader());
        paxPrinter.printHorizontalLineOfStars();
        paxPrinter.setAlignment(Printer.Alignment.LEFT);
        paxPrinter.printLabeledData("Terminal Code:", this.bankReceipt.getTerminalCode());
        paxPrinter.printLabeledData("Account Number:", this.bankReceipt.getAccountNumber());
        paxPrinter.printLabeledData(this.bankReceipt.getDate(), this.bankReceipt.getTime());
        paxPrinter.printLabeledData("Reference Number:", this.bankReceipt.getReferenceNumber(), true);
        paxPrinter.printHorizontalLine();
        paxPrinter.setAlignment(Printer.Alignment.CENTER);
        paxPrinter.printText(this.bankReceipt.getStatus(), true);
        paxPrinter.printLabeledData("Amount", this.bankReceipt.getAmount());
        paxPrinter.printLabeledData("Fees", this.bankReceipt.getFees());
        paxPrinter.printLabeledData("Total Amount", this.bankReceipt.getTotalAmount(), true);
        paxPrinter.setAlignment(Printer.Alignment.CENTER);
        paxPrinter.printHorizontalLine();
        paxPrinter.printText(this.bankReceipt.getTransactionType(), true);
        paxPrinter.printText(this.bankReceipt.getPan(), true, 0xffffff, FontSize.LARGE, true);
        paxPrinter.printLabeledData(this.bankReceipt.getCardExpiration(), this.bankReceipt.getCardMode());
        paxPrinter.printLabeledData(this.bankReceipt.getBatchNumber(), this.bankReceipt.getTraceNumber());
        paxPrinter.printLabeledData(this.bankReceipt.getApplicationName(), this.bankReceipt.getApplicationId());
        paxPrinter.setAlignment(Printer.Alignment.RIGHT);
        paxPrinter.printText(this.bankReceipt.getCardHolderName());
        paxPrinter.printHorizontalLine();
        paxPrinter.setAlignment(Printer.Alignment.CENTER);
        paxPrinter.printText("Merchant Copy");
        paxPrinter.close();
    }
}
