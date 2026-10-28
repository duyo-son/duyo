import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // PoC는 native messaging을 사용하지 않으며 메시지/프로필을 기록하지 않는다.
        context.completeRequest(returningItems: [], completionHandler: nil)
    }
}
