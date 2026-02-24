package com.anonymous.GSCyrusPOS.core;

import android.graphics.Bitmap;

import com.pax.gl.page.IPage;

public class PrintText {
    //    text, size, selectedAlign, bold
    private String text;
    private String text2;
    private int size;
    private Printer.Alignment alignment;
    private boolean bold;
    private Bitmap bitMap;
    private IPage iPage; //for pax usage only

    public PrintText(String text, int size, Printer.Alignment alignment, boolean bold) {
        this.text = text;
        this.size = size;
        this.alignment = alignment;
        this.bold = bold;
    }

    public PrintText(String text1, String text2, int size, boolean bold) {
        this.text = text1;
        this.text2 = text2;
        this.size = size;
        this.bold = bold;
    }

    public PrintText(Bitmap bitMap) {
        this.bitMap = bitMap;
        this.alignment = Printer.Alignment.CENTER;
    }

    public PrintText(IPage iPage) { //for pax usage only
        this.iPage = iPage;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getText2() {
        return text2;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public Printer.Alignment getAlignment() {
        return alignment;
    }

    public boolean isBold() {
        return bold;
    }

    public void setBold(boolean bold) {
        this.bold = bold;
    }

    public Bitmap getBitMap() {
        return bitMap;
    }

    public IPage getIPage() {
        return iPage;
    }

    public void setIPage(IPage iPage) {
        this.iPage = iPage;
    }
}
