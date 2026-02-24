package com.anonymous.GSCyrusPOS.core.receipt;

public class BankReceipt {

    private String receiptHeader;
    private String accountNumber;
    private String terminalCode;
    private String referenceNumber;
    private String date;
    private String time;

    private String status;
    private String amount;
    private String fees;
    private String totalAmount;

    private String transactionType;
    private String pan;
    private String merchantId;
    private String terminalId;
    private String applicationId;
    private String applicationName;
    private String traceNumber;
    private String batchNumber;

    private String cardMode;
    private String cardExpiration;
    private String cardHolderName;

    public void fill(String amount) {
        this.receiptHeader = "Transaction Header";
        this.accountNumber = "121212";
        this.terminalCode = "N500000000X";
        this.referenceNumber = "12345678";
        this.date = "10-12-2023";
        this.time = "17:30";

        this.status = "Successful Transaction";
        this.amount = amount + "EGP";
        this.fees = "2.0 EGP";
        try {
            this.totalAmount = (Double.parseDouble(amount) + 2.0) + " EGP";
        } catch (NumberFormatException numberFormatException) {
            numberFormatException.printStackTrace();
            this.totalAmount = "500 EGP";
        }

        this.transactionType = "Sale Transaction";
        this.pan = "12313****123081";
        this.terminalId = "N500000000X";
        this.merchantId = "12131314124";
        this.applicationId = "A0000000032010";
        this.applicationName = "VISA Electron";
        this.traceNumber = "111222";
        this.batchNumber = "0101010";

        this.cardMode = "chip";
        this.cardExpiration = "xx\\xx";
        this.cardHolderName = "Holder Name";
    }

    public String getReceiptHeader() {
        return receiptHeader;
    }

    public void setReceiptHeader(String receiptHeader) {
        this.receiptHeader = receiptHeader;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getTerminalCode() {
        return terminalCode;
    }

    public void setTerminalCode(String terminalCode) {
        this.terminalCode = terminalCode;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getAmount() {
        return amount;
    }

    public void setAmount(String amount) {
        this.amount = amount;
    }

    public String getFees() {
        return fees;
    }

    public void setFees(String fees) {
        this.fees = fees;
    }

    public String getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(String totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getMerchantId() {
        return merchantId;
    }

    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }

    public String getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(String terminalId) {
        this.terminalId = terminalId;
    }

    public String getPan() {
        return pan;
    }

    public void setPan(String pan) {
        this.pan = pan;
    }

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public String getApplicationName() {
        return applicationName;
    }

    public void setApplicationName(String applicationName) {
        this.applicationName = applicationName;
    }

    public String getTraceNumber() {
        return traceNumber;
    }

    public void setTraceNumber(String traceNumber) {
        this.traceNumber = traceNumber;
    }

    public String getCardMode() {
        return cardMode;
    }

    public void setCardMode(String cardMode) {
        this.cardMode = cardMode;
    }

    public String getCardExpiration() {
        return cardExpiration;
    }

    public void setCardExpiration(String cardExpiration) {
        this.cardExpiration = cardExpiration;
    }

    public String getCardHolderName() {
        return cardHolderName;
    }

    public void setCardHolderName(String cardHolderName) {
        this.cardHolderName = cardHolderName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }
}
