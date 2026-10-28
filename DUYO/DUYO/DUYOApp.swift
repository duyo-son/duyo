import SwiftUI

@main
struct DUYOApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                Form {
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            Image("LargeIcon")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 80, height: 80)
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .accessibilityHidden(true)
                            Text("Why pay for pixels?")
                                .font(.title2.bold())
                            Text("More room for the web.")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 12)
                    }
                    Section {
                        Label {
                            VStack(alignment: .leading, spacing: 4) {
                            Text("Turn on DUYO")
                            Text("Settings → Apps → Safari → Extensions")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "1.circle.fill")
                        }
                        Label {
                            VStack(alignment: .leading, spacing: 4) {
                            Text("Allow all websites")
                            Text("Choose All Websites in Safari’s extension permissions.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "2.circle.fill")
                        }
                        Label {
                            VStack(alignment: .leading, spacing: 4) {
                            Text("Make room")
                            Text("Automatic application is on by default. Adjust it from DUYO in Safari’s page menu.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            }
                        } icon: {
                            Image(systemName: "3.circle.fill")
                        }
                    } header: {
                        Text("Get started")
                    } footer: {
                        Text("The optional edge arrow restores or expands the page. It hides when expansion is unavailable.")
                    }
                    Section {
                        Label("Development preview", systemImage: "hammer")
                        Text("Website compatibility is still being tested. Left-edge expansion is currently unavailable; DUYO restores the page in unsupported conditions.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Section {
                        Link(destination: URL(string: "https://github.com/duyo-son/duyo")!) {
                            Label("Source on GitHub", systemImage: "chevron.left.forwardslash.chevron.right")
                        }
                        Label("Private by design", systemImage: "hand.raised")
                            .foregroundStyle(.secondary)
                    } footer: {
                        Text("Free forever · No ads or tracking · MIT")
                    }
                }
                .navigationTitle("DUYO")
            }
        }
    }
}
