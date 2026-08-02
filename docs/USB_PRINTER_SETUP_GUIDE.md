# USB Thermal Printer Setup Guide

This guide explains how to set up any Windows PC to use the "Print Label (USB)" feature in the APCS Admin Dashboard. 

Because we use the **WebUSB API** to bypass HTML margins and print perfectly every time, the web browser needs direct access to the printer hardware. By default, Windows blocks browsers from doing this. 

You will need to perform this 1-minute setup on **every new PC** you want to print from.

## Prerequisites
1. You must use **Google Chrome** or **Microsoft Edge**. (Firefox and Safari do not support WebUSB).
2. The thermal printer must be physically plugged into the PC via USB and turned on.
3. Install the thermal printer software at www.cnfujun.com/d/38, execute the POS Printer Driver Setup.exe. make sure to select POS58 series.

## Setup Instructions (Using Zadig)

To allow Chrome to talk directly to the printer, we need to swap the default Windows printer driver to a universal USB driver (`WinUSB`). 

1. **Download Zadig:**
   - Go to [https://zadig.akeo.ie/](https://zadig.akeo.ie/)
   - Scroll down to the "Download" section and download the latest `zadig.exe`.
   - You do not need to install it; just double-click the `.exe` file to run it.

2. **Configure Zadig:**
   - In the Zadig top menu, click **Options** -> **List All Devices**.
   - Click the large dropdown menu in the center of the window.
   - Find and select your thermal printer from the list (It may be named `POS58 Printer`, `USB Printing Support`, `Printer`, or the brand name).

3. **Replace the Driver:**
   - Look at the target driver box on the right side (where the green arrow points). 
   - Ensure it is set to **`WinUSB`** (use the small up/down arrows to change it if it is not).
   - Click the big **Replace Driver** (or **Install Driver**) button.
   - Wait 10-20 seconds for the "Driver Installation was successful" message.

4. **Print:**
   - Close Zadig.
   - Go to the APCS Admin Dashboard in Chrome.
   - Click **Print Label (USB)**, select your registrants, and click Print!
   - A Chrome popup will appear in the top-left asking you to select the USB device. Select your printer and click "Connect".

---

## Troubleshooting & Important Notes

### Reverting to Normal Windows Printing
By installing `WinUSB`, Windows will no longer see this device as a "Standard Printer". This means you **cannot** print Word documents or PDFs to it using the normal `Ctrl+P` method. It is now dedicated to the APCS WebUSB system.

If you ever need to use it as a normal printer again, it is very easy to revert:
1. Open Windows **Device Manager**.
2. Find the printer in the list (usually under "Universal Serial Bus devices").
3. Right-click it -> **Uninstall Device**.
4. Unplug the printer's USB cable and plug it back in. Windows will instantly reinstall the standard driver.

### "Access Denied" or "Failed to Claim Interface" Error
If you see this error pop up in the APCS Dashboard:
1. It means Windows (or another app) is currently locking the printer.
2. Ensure you have run Zadig correctly and selected `WinUSB`.
3. Try unplugging the USB cable, plugging it back in, and refreshing the webpage. 
4. Ensure you don't have the printer's official setup software running in the background.
