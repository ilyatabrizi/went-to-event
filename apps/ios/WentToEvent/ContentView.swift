import SwiftUI
import PhotosUI
import UIKit

private struct ProfileGearMark: View {
    var body: some View {
        ZStack {
            GearOutline().stroke(style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))
            Circle().inset(by: 1).stroke(lineWidth: 1.6)
                .frame(width: 9, height: 9)
        }
        .frame(width: 21, height: 21)
        .accessibilityHidden(true)
    }
}

private struct GearOutline: Shape {
    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2
        let toothProfile: [CGFloat] = [0.72, 0.72, 0.94, 0.94, 0.94, 0.72, 0.72, 0.72]
        var path = Path()
        for index in 0..<64 {
            let angle = -CGFloat.pi / 2 + CGFloat(index) * 2 * CGFloat.pi / 64
            let distance = radius * toothProfile[index % toothProfile.count]
            let point = CGPoint(x: center.x + cos(angle) * distance, y: center.y + sin(angle) * distance)
            if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }
}

@MainActor
struct ContentView: View {
    @StateObject private var store = EventStore()
    @StateObject private var auth = AuthStore()
    @StateObject private var saved = SavedEventsStore()
    @State private var showAuthNotice = false
    @State private var selectedTab: AppTab = .home

    init() {
        _store = StateObject(wrappedValue: EventStore())
        _auth = StateObject(wrappedValue: AuthStore())
        _saved = StateObject(wrappedValue: SavedEventsStore())
    }

    var body: some View {
        ZStack {
            Group {
                switch selectedTab {
                case .home:
                    homePage
                case .explore:
                    explorePage
                case .booked:
                    BookingsView(auth: auth) { selectedTab = .home }
                case .chat:
                    ChatView()
                case .profile:
                    NavigationStack {
                        ProfileView(auth: auth, saved: saved, events: store.events, onExit: { selectedTab = .home }) {
                            showAuthNotice = true
                        } onOpenBookings: {
                            selectedTab = .booked
                        }
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            bottomNavigation
        }
        .tint(Color(red: 0.95, green: 0.93, blue: 0.88))
        .alert("Sign-in unavailable", isPresented: $showAuthNotice) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("The iOS preview is in guest mode. Sign-in and booking are temporarily disabled.")
        }
    }

    private var homePage: some View {
        NavigationStack {
            eventList(title: "What’s happening?")
                .navigationTitle("What’s happening?")
                .navigationBarTitleDisplayMode(.large)
                .toolbar { brandToolbarItem }
                .task { await store.load() }
                .refreshable { await store.load() }
        }
    }

    private var explorePage: some View {
        NavigationStack {
            eventList(title: "Explore")
                .navigationTitle("Explore")
                .navigationBarTitleDisplayMode(.large)
                .toolbar { brandToolbarItem }
                .task { await store.load() }
        }
    }

    private var brandToolbarItem: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Image("WteMark")
                .resizable()
                .scaledToFit()
                .frame(width: 30, height: 30)
                .accessibilityLabel("Went To Event")
        }
    }

    private func eventList(title: String) -> some View {
        Group {
            if store.isLoading && store.events.isEmpty {
                ProgressView("Finding events…")
            } else if let errorMessage = store.errorMessage, store.events.isEmpty {
                ContentUnavailableView {
                    Label("Couldn’t load events", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(errorMessage)
                } actions: {
                    Button("Try again") {
                        Task { await store.load() }
                    }
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 14) {
                        HStack {
                            Label("Tabriz", systemImage: "location.fill")
                            Spacer()
                            Text("\(store.events.count) events").foregroundStyle(.secondary)
                        }
                        .font(.subheadline)
                        .padding(.horizontal)

                        ForEach(store.events) { event in
                            NavigationLink(value: event) { EventCard(event: event) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical)
                }
                .navigationDestination(for: Event.self) { event in
                    EventDetailView(event: event, auth: auth, saved: saved) { showAuthNotice = true }
                }
            }
        }
    }

    private var bottomNavigation: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                Button { selectedTab = tab } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 17, weight: .semibold))
                        Text(tab.title)
                            .font(.caption2.weight(.semibold))
                    }
                    .foregroundStyle(selectedTab == tab ? Color(red: 0.06, green: 0.05, blue: 0.07) : Color.primary.opacity(0.68))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background {
                        if selectedTab == tab {
                            Capsule().fill(Color(red: 0.95, green: 0.93, blue: 0.88))
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
            }
        }
        .padding(6)
        .background(.regularMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.14), lineWidth: 1))
        .shadow(color: .black.opacity(0.3), radius: 18, x: 0, y: 8)
        .padding(.horizontal, 24)
        .padding(.top, 8)
        .padding(.bottom, 8)
    }
}

private enum AppTab: String, CaseIterable, Identifiable {
    case home, explore, profile, booked, chat

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Home"
        case .explore: "Explore"
        case .booked: "Booked"
        case .chat: "Chat"
        case .profile: "Profile"
        }
    }

    var icon: String {
        switch self {
        case .home: "house"
        case .explore: "safari"
        case .booked: "ticket"
        case .chat: "bubble.left.and.bubble.right"
        case .profile: "person.crop.circle"
        }
    }
}

private struct ChatView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 26, weight: .semibold))
                    .frame(width: 62, height: 62)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(Circle())
                Text("Your chats")
                    .font(.title2.weight(.bold))
                Text("Connect with hosts and people going to the same events.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Chat")
        }
    }
}

private struct EventCard: View {
    let event: Event

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Artwork(category: event.category).frame(height: 170)
            VStack(alignment: .leading, spacing: 7) {
                Text(event.category.uppercased())
                    .font(.caption.weight(.bold)).tracking(1.1).foregroundStyle(.secondary)
                Text(event.title).font(.title3.weight(.bold))
                Text("\(event.startsAt.formatted(date: .abbreviated, time: .shortened)) · \(event.venue.name)")
                    .font(.subheadline).foregroundStyle(.secondary)
                HStack {
                    Text(priceLabel).font(.subheadline.weight(.semibold))
                    Spacer()
                    Text("\(event.goingCount) going →").font(.caption).foregroundStyle(.secondary)
                }
                .padding(.top, 8)
            }
            .padding(16)
        }
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .padding(.horizontal)
    }

    private var priceLabel: String {
        let lowest = event.ticketTiers.map(\.priceCents).min() ?? 0
        return lowest == 0 ? "Free" : "From $\(lowest / 100)"
    }
}

@MainActor
struct EventDetailView: View {
    let event: Event
    @ObservedObject var auth: AuthStore
    let onRequireAuth: () -> Void
    @ObservedObject var saved: SavedEventsStore
    @State private var selectedTierID: String?
    @State private var quantity = 1
    @State private var booking: Booking?
    @State private var isBooking = false
    @State private var errorMessage: String?

    init(event: Event, auth: AuthStore, saved: SavedEventsStore, onRequireAuth: @escaping () -> Void) {
        self.event = event
        self.auth = auth
        self.saved = saved
        self.onRequireAuth = onRequireAuth
        _selectedTierID = State(initialValue: event.ticketTiers.first?.id)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Artwork(category: event.category)
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                VStack(alignment: .leading, spacing: 10) {
                    Text(event.category.uppercased())
                        .font(.caption.weight(.bold)).tracking(1.1).foregroundStyle(.secondary)
                    Text(event.title).font(.largeTitle.bold())
                    Text(event.description).foregroundStyle(.secondary)
                }
                Button {
                    saved.toggle(event.id)
                } label: {
                    Label(saved.contains(event.id) ? "Saved event" : "Save event", systemImage: saved.contains(event.id) ? "bookmark.fill" : "bookmark")
                }
                .buttonStyle(.bordered)
                VStack(alignment: .leading, spacing: 16) {
                    DetailRow(label: "When", value: event.startsAt.formatted(date: .complete, time: .shortened))
                    DetailRow(label: "Where", value: "\(event.venue.name)\n\(event.venue.address)")
                    DetailRow(label: "Hosted by", value: event.host.name)
                }
                .padding()
                .background(Color(uiColor: .secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                ticketPicker
                if let booking { BookingConfirmation(booking: booking) } else { bookingAction }
            }
            .padding()
        }
        .navigationTitle("Event")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var ticketPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Tickets").font(.title2.bold())
                Spacer()
                Text("\(event.goingCount) going").foregroundStyle(.secondary)
            }
            ForEach(event.ticketTiers) { tier in
                Button { selectedTierID = tier.id } label: {
                    HStack {
                        Image(systemName: selectedTierID == tier.id ? "checkmark.circle.fill" : "circle")
                        VStack(alignment: .leading, spacing: 4) {
                            Text(tier.name).fontWeight(.semibold)
                            Text(tier.description).font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(tier.priceCents == 0 ? "Free" : "$\(tier.priceCents / 100)").fontWeight(.semibold)
                    }
                    .foregroundStyle(.primary)
                    .padding()
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            HStack {
                Text("Quantity")
                Spacer()
                Stepper("\(quantity)", value: $quantity, in: 1...10).labelsHidden()
                Text("\(quantity)").frame(minWidth: 24)
            }
            .padding(.top, 4)
        }
    }

    private var bookingAction: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                guard auth.isSignedIn else { onRequireAuth(); return }
                Task { await createBooking() }
            } label: {
                Text(auth.isSignedIn ? (isBooking ? "Confirming…" : "Confirm booking") : "Sign in to book")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isBooking || selectedTierID == nil)
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(.red) }
        }
    }

    private func createBooking() async {
        guard let accessToken = try? await auth.accessToken(), let selectedTierID else { return }
        isBooking = true
        errorMessage = nil
        do {
            booking = try await APIClient().createBooking(
                accessToken: accessToken,
                input: CreateBookingInput(eventId: event.id, ticketTierId: selectedTierID, quantity: quantity),
            )
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isBooking = false
    }
}

@MainActor
private struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var auth: AuthStore
    @ObservedObject var saved: SavedEventsStore
    let events: [Event]
    let onExit: (() -> Void)?
    let onSignIn: () -> Void
    let onOpenBookings: () -> Void
    @StateObject private var reminders = ReminderStore()
    @State private var profile: UserProfile?
    @State private var username = ""
    @State private var displayName = ""
    @State private var avatarUrl = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isSaving = false
    @State private var profileError: String?
    @State private var profileNotice: String?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var isUploadingPhoto = false
    @State private var showSettings = false

    var body: some View {
        Group {
            if let user = auth.user {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Button { onExit?() ?? dismiss() } label: {
                                Text("e.").font(.system(size: 24, weight: .black, design: .rounded))
                            }
                            .foregroundStyle(.primary)
                            Spacer()
                            Button { showSettings = true } label: {
                                ProfileGearMark()
                                    .frame(width: 40, height: 40)
                                    .background(Circle().fill(Color.primary.opacity(0.06)))
                                    .contentShape(Circle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Settings")
                        }
                        .padding(.bottom, 22)
                        HStack(spacing: 15) {
                            profileAvatar(user: user).frame(width: 74, height: 74)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(profile?.displayName ?? "Your name").font(.title2.weight(.bold))
                                Text(profile?.username.map { "@\($0)" } ?? user.email ?? "No email").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        Text("Chasing warehouse sets and slow rooftop mornings.")
                            .font(.subheadline).foregroundStyle(.secondary).padding(.top, 14)
                        HStack(spacing: 22) {
                            profileStat("428", "followers")
                            profileStat("186", "following")
                        }.padding(.top, 16)
                        HStack(spacing: 10) {
                            Button { onExit?() ?? dismiss() } label: {
                                Label("Publish an event", systemImage: "plus").font(.subheadline.weight(.bold)).frame(maxWidth: .infinity).padding(.vertical, 14)
                            }.buttonStyle(.borderedProminent)
                            Button {} label: { Image(systemName: "paperplane").frame(width: 46, height: 46) }.buttonStyle(.bordered)
                        }.padding(.top, 18)
                        profileShortcut(title: "Went Membership", subtitle: "No booking fees, members-only nights, early access.", systemImage: "diamond") { }
                            .padding(.top, 14)
                        HStack(spacing: 0) {
                            profileTab("Posts · 0", selected: true)
                            profileTab("Saved · \(saved.eventIDs.count)", selected: false)
                            profileTab("Going", selected: false)
                        }
                        .padding(4).background(Color(uiColor: .secondarySystemBackground)).clipShape(Capsule()).padding(.top, 22)
                        if let profileError { Text(profileError).foregroundStyle(.red).padding(.top, 14) }
                        if let profileNotice { Text(profileNotice).foregroundStyle(.secondary).padding(.top, 14) }
                        savedEventsSection.padding(.top, 26)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 18)
                }
                .task { await loadProfile() }
                .onChange(of: selectedPhoto) { _, item in
                    guard let item else { return }
                    Task { await uploadPhoto(item) }
                }
                .sheet(isPresented: $showSettings) {
                    NavigationStack {
                        ScrollView { VStack(spacing: 18) { profileSettingsCard; accountSecurityCard }.padding() }
                            .navigationTitle("Settings")
                            .navigationBarTitleDisplayMode(.inline)
                    }
                }
            } else {
                ContentUnavailableView {
                    Label("Sign in to see your profile", systemImage: "person.crop.circle")
                } description: {
                    Text("Create an account to book events and keep your passes here.")
                } actions: {
                    Button("Sign in or sign up") { onExit?() ?? dismiss(); onSignIn() }
                }
            }
        }
        .navigationTitle("Profile")
    }

    private func profileStat(_ value: String, _ label: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 5) {
            Text(value).font(.subheadline.weight(.bold))
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }

    private func profileTab(_ title: String, selected: Bool) -> some View {
        Text(title)
            .font(.subheadline.weight(selected ? .bold : .regular))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(selected ? Color(uiColor: .systemBackground) : .clear)
            .clipShape(Capsule())
    }

    private var profileSettingsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            settingsHeading(title: "YOUR IDENTITY", detail: "Public profile")
            profileField("Display name", text: $displayName, placeholder: "Your name")
            profileField("Username", text: $username, placeholder: "your_username")
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            profileField("Profile picture URL", text: $avatarUrl, placeholder: "https://…")
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                Label(isUploadingPhoto ? "Uploading…" : "Choose a picture", systemImage: "photo")
                    .font(.subheadline.weight(.semibold))
            }
            .disabled(isUploadingPhoto)
            Button(isSaving ? "Saving…" : "Save profile") {
                Task { await saveProfile() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isSaving)
        }
        .padding(18)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var accountSecurityCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            settingsHeading(title: "ACCOUNT SECURITY", detail: "Private")
            profileField("Email address", text: $email, placeholder: auth.user?.email ?? "you@example.com")
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            SecureField("New password", text: $password)
                .textContentType(.newPassword)
                .padding(12)
                .background(Color(uiColor: .systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            Button(isSaving ? "Updating…" : "Update account") {
                Task { await saveAccount() }
            }
            .buttonStyle(.bordered)
            .disabled(isSaving || (email.isEmpty && password.isEmpty))
        }
        .padding(18)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var savedEventsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Saved events")
                    .font(.title3.weight(.bold))
                Spacer()
                Text("\(saved.eventIDs.count)")
                    .foregroundStyle(.secondary)
            }
            let savedEvents = events.filter { saved.contains($0.id) }
            if savedEvents.isEmpty {
                VStack(alignment: .leading, spacing: 5) {
                    Text("No saved events yet.")
                        .font(.headline)
                    Text("Save an event from its detail page and it will appear here.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(uiColor: .secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            } else {
                ForEach(savedEvents) { event in
                    NavigationLink {
                        EventDetailView(event: event, auth: auth, saved: saved) { onSignIn() }
                    } label: {
                        HStack(spacing: 12) {
                            Artwork(category: event.category)
                                .frame(width: 70, height: 70)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            VStack(alignment: .leading, spacing: 5) {
                                Text(event.title)
                                    .font(.subheadline.weight(.semibold))
                                    .lineLimit(1)
                                Text("\(event.startsAt.formatted(date: .abbreviated, time: .shortened)) · \(event.venue.name)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(10)
                        .foregroundStyle(.primary)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func settingsHeading(title: String, detail: String) -> some View {
        HStack {
            Text(title)
                .font(.caption.weight(.bold))
                .tracking(1.2)
            Spacer()
            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func profileField(_ title: String, text: Binding<String>, placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField(placeholder, text: text)
                .padding(12)
                .background(Color(uiColor: .systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func activityStat(value: Int, title: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(value)")
                .font(.title2.weight(.bold))
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func profileShortcut(title: String, subtitle: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.subheadline.weight(.semibold))
                    Text(subtitle).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.caption.weight(.bold))
            }
            .padding(15)
            .foregroundStyle(.primary)
            .background(Color(uiColor: .secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func profileAvatar(user: AuthUser) -> some View {
        Group {
            if let avatarUrl = profile?.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    initialsAvatar(user: user)
                }
            } else {
                initialsAvatar(user: user)
            }
        }
        .frame(width: 52, height: 52)
        .clipShape(Circle())
    }

    private func initialsAvatar(user: AuthUser) -> some View {
        Text((displayName.isEmpty ? (user.email ?? "U") : displayName).prefix(1).uppercased())
            .font(.title2.bold())
            .frame(width: 48, height: 48)
            .background(Color.primary)
            .foregroundStyle(Color(uiColor: .systemBackground))
            .clipShape(Circle())
    }

    private func loadProfile() async {
        guard let token = try? await auth.accessToken() else { return }
        do {
            let loaded = try await APIClient().getProfile(accessToken: token)
            profile = loaded
            username = loaded.username ?? ""
            displayName = loaded.displayName ?? ""
            avatarUrl = loaded.avatarUrl ?? ""
        } catch {
            profileError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func saveProfile() async {
        guard let token = try? await auth.accessToken() else { return }
        isSaving = true
        profileError = nil
        profileNotice = nil
        do {
            profile = try await APIClient().updateProfile(
                accessToken: token,
                input: ProfileUpdateInput(username: username, displayName: displayName, avatarUrl: avatarUrl),
            )
            profileNotice = "Profile updated."
        } catch {
            profileError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isSaving = false
    }

    private func saveAccount() async {
        guard let token = try? await auth.accessToken() else { return }
        isSaving = true
        profileError = nil
        profileNotice = nil
        do {
            _ = try await APIClient().updateAccount(
                accessToken: token,
                input: AccountUpdateInput(email: email.isEmpty ? nil : email, password: password.isEmpty ? nil : password),
            )
            email = ""
            password = ""
            await auth.refreshUser()
            profileNotice = "Account updated. Check your email if confirmation is required."
        } catch {
            profileError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isSaving = false
    }

    private func uploadPhoto(_ item: PhotosPickerItem) async {
        guard let token = try? await auth.accessToken() else { return }
        isUploadingPhoto = true
        profileError = nil
        profileNotice = nil
        defer {
            isUploadingPhoto = false
            selectedPhoto = nil
        }

        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data),
                  let cropped = cropSquare(image),
                  let jpeg = cropped.jpegData(compressionQuality: 0.86)
            else {
                throw APIError.message("Could not read that image.")
            }

            profile = try await APIClient().uploadProfilePicture(
                accessToken: token,
                input: ProfilePictureUploadInput(data: jpeg.base64EncodedString(), contentType: "image/jpeg"),
            )
            avatarUrl = profile?.avatarUrl ?? ""
            profileNotice = "Profile picture updated."
        } catch {
            profileError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func cropSquare(_ image: UIImage) -> UIImage? {
        let side = min(image.size.width, image.size.height)
        let origin = CGPoint(x: (image.size.width - side) / 2, y: (image.size.height - side) / 2)
        let cropRect = CGRect(origin: origin, size: CGSize(width: side, height: side))
        guard let cgImage = image.cgImage?.cropping(to: cropRect) else { return nil }
        let cropped = UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 512, height: 512))
        return renderer.image { _ in cropped.draw(in: CGRect(x: 0, y: 0, width: 512, height: 512)) }
    }
}

@MainActor
private struct BookingsView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var auth: AuthStore
    let onExit: (() -> Void)?
    @State private var bookings: [Booking] = []
    @State private var events: [String: Event] = [:]
    @State private var selectedBooking: Booking?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack {
                        Button { onExit?() ?? dismiss() } label: {
                            Text("e.")
                                .font(.system(size: 24, weight: .black, design: .rounded))
                        }
                        .foregroundStyle(.primary)
                        .accessibilityLabel("Back to events")

                        Spacer()

                        Text("Your bookings")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 7) {
                        Text("Your passes")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                        Text("Everything you’re going to, in one place.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    if isLoading {
                        bookingState(icon: "ticket", title: "Finding your passes…", message: "Your bookings will appear here in a moment.", showsProgress: true)
                    } else if let errorMessage {
                        bookingState(icon: "wifi.exclamationmark", title: "Couldn’t load bookings", message: errorMessage)
                    } else if bookings.isEmpty {
                        bookingState(icon: "ticket", title: "No bookings yet", message: "Book an event and your pass will appear here.")
                    } else {
                        bookingSection(title: "Upcoming", bookings: bookings.filter(isUpcoming))
                        bookingSection(title: "Past", bookings: bookings.filter { !isUpcoming($0) })
                    }
                }
                .padding(.horizontal)
                .padding(.top, 18)
                .padding(.bottom, 28)
            }
            .background(Color(uiColor: .systemBackground))
            .toolbar(.hidden, for: .navigationBar)
            .task { await loadBookings() }
            .navigationDestination(item: $selectedBooking) { booking in
                BookingPassView(booking: booking, event: events[booking.eventId])
            }
        }
    }

    @ViewBuilder
    private func bookingSection(title: String, bookings: [Booking]) -> some View {
        if !bookings.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(title.uppercased())
                    .font(.caption.weight(.bold))
                    .tracking(1.4)
                    .foregroundStyle(.secondary)

                ForEach(bookings) { booking in
                    Button {
                        selectedBooking = booking
                    } label: {
                        BookingRow(booking: booking, event: events[booking.eventId])
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func bookingState(icon: String, title: String, message: String, showsProgress: Bool = false) -> some View {
        VStack(spacing: 14) {
            if showsProgress {
                ProgressView()
                    .tint(.primary)
                    .scaleEffect(1.15)
            } else {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .semibold))
                    .frame(width: 52, height: 52)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(Circle())
            }
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 42)
    }

    private func isUpcoming(_ booking: Booking) -> Bool {
        guard let event = events[booking.eventId] else { return false }
        return event.endsAt >= Date()
    }

    private func loadBookings() async {
        guard let accessToken = try? await auth.accessToken() else { isLoading = false; return }
        do {
            bookings = try await APIClient().getBookings(accessToken: accessToken)
            let eventIDs = Set(bookings.map(\.eventId))
            for eventID in eventIDs {
                if let event = try? await APIClient().getEvent(id: eventID) {
                    events[eventID] = event
                }
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isLoading = false
    }
}

private struct BookingRow: View {
    let booking: Booking
    let event: Event?

    var body: some View {
        HStack(spacing: 14) {
            Artwork(category: event?.category ?? "")
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 5) {
                Text(event?.title ?? "Event booking")
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                if let event {
                    Text(event.startsAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Text("\(booking.quantity) ticket\(booking.quantity == 1 ? "" : "s") · $\(Double(booking.totalCents) / 100, specifier: "%.2f")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

private struct BookingPassView: View {
    @Environment(\.dismiss) private var dismiss
    let booking: Booking
    let event: Event?
    @StateObject private var reminders = ReminderStore()
    @State private var reminderError: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                HStack {
                    Button { dismiss() } label: {
                        Label("Bookings", systemImage: "chevron.left")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.primary)
                    Spacer()
                    Text("Your pass")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .padding(.bottom, 18)

                Artwork(category: event?.category ?? "")
                    .frame(height: 190)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))

                VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        Label("Confirmed pass", systemImage: "checkmark.seal.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.green)
                        Spacer()
                        Text(booking.status.capitalized)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }

                        Text(event?.title ?? "Your event pass")
                            .font(.largeTitle.bold())

                        if let event {
                            VStack(alignment: .leading, spacing: 12) {
                                DetailRow(label: "When", value: event.startsAt.formatted(date: .complete, time: .shortened))
                                DetailRow(label: "Until", value: event.endsAt.formatted(date: .complete, time: .shortened))
                                DetailRow(label: "Where", value: "\(event.venue.name)\n\(event.venue.address)")
                                DetailRow(label: "Hosted by", value: event.host.name)
                            }
                        }

                        Divider()

                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(ticketName.uppercased())
                                    .font(.caption.weight(.bold))
                                    .tracking(1)
                                    .foregroundStyle(.secondary)
                                Text("\(booking.quantity) ticket\(booking.quantity == 1 ? "" : "s")")
                                    .font(.headline)
                            }
                            Spacer()
                            Text("$\(Double(booking.totalCents) / 100, specifier: "%.2f")")
                                .font(.title3.bold())
                        }

                        VStack(spacing: 8) {
                            Text("BOOKING REFERENCE")
                                .font(.caption2.weight(.bold))
                                .tracking(1.5)
                                .foregroundStyle(.secondary)
                            Text(String(booking.id.prefix(8)).uppercased())
                                .font(.system(size: 30, weight: .bold, design: .monospaced))
                                .tracking(4)
                            Text("Show this reference at the door")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                        VStack(alignment: .leading, spacing: 12) {
                            DetailRow(label: "Ticket", value: ticketName)
                            DetailRow(label: "Quantity", value: "\(booking.quantity) ticket\(booking.quantity == 1 ? "" : "s")")
                            DetailRow(label: "Total", value: formattedTotal)
                            DetailRow(label: "Booked", value: formattedBookingDate)
                        }

                    if let event, event.endsAt >= Date() {
                        reminderSection(event: event)
                    }
                }
                .padding(22)
            }
            .background(Color(uiColor: .systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .toolbar(.hidden, for: .navigationBar)
    }

    @ViewBuilder
    private func reminderSection(event: Event) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Event reminder", systemImage: reminders.isReminderSet(for: booking) ? "bell.fill" : "bell")
                .font(.headline)

            Text(reminders.isReminderSet(for: booking)
                ? "We’ll remind you one hour before the event."
                : "Get a notification one hour before the event starts.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if let reminderError {
                Text(reminderError)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button {
                Task {
                    reminderError = nil
                    do {
                        if reminders.isReminderSet(for: booking) {
                            await reminders.cancelReminder(for: booking)
                        } else {
                            try await reminders.setReminder(for: booking, event: event)
                        }
                    } catch {
                        reminderError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                    }
                }
            } label: {
                Label(
                    reminders.isReminderSet(for: booking) ? "Cancel reminder" : "Remind me",
                    systemImage: reminders.isReminderSet(for: booking) ? "bell.slash" : "bell.badge",
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.primary)
            .padding(.vertical, 13)
            .frame(maxWidth: .infinity)
            .background(Color(red: 0.95, green: 0.93, blue: 0.88))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(16)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var ticketName: String {
        event?.ticketTiers.first(where: { $0.id == booking.ticketTierId })?.name ?? "Ticket"
    }

    private var formattedBookingDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: booking.createdAt) ?? ISO8601DateFormatter().date(from: booking.createdAt) else {
            return booking.createdAt
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    private var formattedTotal: String {
        String(format: "$%.2f", Double(booking.totalCents) / 100)
    }
}

private struct BookingConfirmation: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Booking confirmed", systemImage: "checkmark.seal.fill").font(.headline).foregroundStyle(.green)
            Text("Reference: \(booking.id.prefix(8).uppercased())").font(.subheadline)
            Text("\(booking.quantity) ticket\(booking.quantity == 1 ? "" : "s") · $\(Double(booking.totalCents) / 100, specifier: "%.2f")")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.green.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption.weight(.bold)).tracking(1).foregroundStyle(.secondary)
            Text(value)
        }
    }
}

private struct Artwork: View {
    let category: String

    var body: some View {
        ZStack {
            LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
            Circle().fill(.white.opacity(0.18)).frame(width: 190, height: 190).blur(radius: 18).offset(x: 80, y: -70)
            Path { path in
                for index in 0...8 {
                    let x = CGFloat(index) * 55
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x - 120, y: 280))
                }
            }
            .stroke(.white.opacity(0.14), lineWidth: 1)
        }
        .clipped()
    }

    private var colors: [Color] {
        switch category {
        case "Nightlife": [Color(red: 0.35, green: 0.10, blue: 0.25), Color(red: 0.08, green: 0.07, blue: 0.12)]
        case "Wellness": [Color(red: 0.18, green: 0.42, blue: 0.38), Color(red: 0.06, green: 0.12, blue: 0.13)]
        case "Food": [Color(red: 0.52, green: 0.30, blue: 0.18), Color(red: 0.12, green: 0.07, blue: 0.06)]
        default: [.purple, .black]
        }
    }
}

#Preview { ContentView() }
