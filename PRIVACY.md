# Privacy

DUYO has no product server, accounts, advertisements, analytics SDK, or tracking code.

The development extension changes page layout locally on HTTP(S) websites that Safari permits it to access. Automatic application defaults to on. Website access is needed to run again on future page loads without another click. Safari remains in control of access permissions.

The extension does not collect form values, passwords, browsing history, or page content. Debug viewport measurements stay in the popup and are not uploaded.

Only global settings—the automatic-application switch, floating-button switch, and selected expansion mode—are saved under `preferences` in extension local storage when you press Apply in the popup. Both default to on if no preferences have been saved. No visited hostname, URL, path, query, or browsing record is stored. You can turn the switches off in the popup, revoke access in Safari settings, or uninstall DUYO to remove its local data.

Development tests run temporary local HTTP servers and save test-only measurements and screenshots under the ignored `artifacts/` directory. These tools are not part of the distributed app. Review artifacts for private information before sharing.

GitHub and the optional Buy Me a Coffee link open external services. Their privacy policies apply when you visit them. DUYO does not embed their tracking scripts.
