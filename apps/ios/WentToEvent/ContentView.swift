import SwiftUI

@MainActor
struct ContentView: View {
    @StateObject private var store = EventStore()
    @StateObject private var auth = AuthStore()
    @State private var showAuth = false
    @State private var showProfile = false
    @State private var showBookings = false

    var body: some View {
        NavigationStack {
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
                    eventList
                }
            }
            .navigationTitle("What’s happening?")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if auth.isSignedIn {
                        Button { showBookings = true } label: {
                            Image(systemName: "ticket")
                        }
                        .accessibilityLabel("Your bookings")
                    }
                    Button { showProfile = true } label: {
                        Image(systemName: auth.isSignedIn ? "person.crop.circle.fill" : "person.crop.circle")
                    }
                    .accessibilityLabel(auth.isSignedIn ? "Profile" : "Sign in")
                }
            }
            .task { await store.load() }
            .refreshable { await store.load() }
        }
        .tint(Color(red: 0.95, green: 0.93, blue: 0.88))
        .sheet(isPresented: $showAuth) { AuthView(auth: auth) }
        .sheet(isPresented: $showProfile) {
            ProfileView(auth: auth) {
                showProfile = false
                showAuth = true
            }
        }
        .sheet(isPresented: $showBookings) { BookingsView(auth: auth) }
    }

    private var eventList: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                HStack {
                    Label("San Francisco", systemImage: "location.fill")
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
            EventDetailView(event: event, auth: auth) { showAuth = true }
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
    @State private var selectedTierID: String?
    @State private var quantity = 1
    @State private var booking: Booking?
    @State private var isBooking = false
    @State private var errorMessage: String?

    init(event: Event, auth: AuthStore, onRequireAuth: @escaping () -> Void) {
        self.event = event
        self.auth = auth
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
        guard let accessToken = auth.session?.accessToken, let selectedTierID else { return }
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
private struct AuthView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var auth: AuthStore
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("Password", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                }
                Section {
                    Button(isSignUp ? "Create account" : "Sign in") {
                        Task {
                            if isSignUp { await auth.signUp(email: email, password: password) }
                            else { await auth.signIn(email: email, password: password) }
                            if auth.isSignedIn { dismiss() }
                        }
                    }
                    .disabled(auth.isLoading || email.isEmpty || password.count < 6)
                    Button(isSignUp ? "Already have an account? Sign in" : "New here? Create an account") {
                        isSignUp.toggle()
                        auth.errorMessage = nil
                        auth.noticeMessage = nil
                    }
                    .buttonStyle(.borderless)
                }
                if auth.isLoading { Section { ProgressView("Working…") } }
                if let errorMessage = auth.errorMessage { Section { Text(errorMessage).foregroundStyle(.red) } }
                if let noticeMessage = auth.noticeMessage { Section { Text(noticeMessage).foregroundStyle(.secondary) } }
            }
            .navigationTitle(isSignUp ? "Create account" : "Sign in")
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Close") { dismiss() } } }
        }
    }
}

@MainActor
private struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var auth: AuthStore
    let onSignIn: () -> Void

    var body: some View {
        NavigationStack {
            Group {
                if let user = auth.user {
                    Form {
                        Section("Account") {
                            LabeledContent("Email", value: user.email ?? "No email")
                            LabeledContent("User ID", value: user.id)
                        }
                        Section {
                            Button("Sign out", role: .destructive) { auth.signOut(); dismiss() }
                        }
                    }
                } else {
                    ContentUnavailableView {
                        Label("Sign in to see your profile", systemImage: "person.crop.circle")
                    } description: {
                        Text("Create an account to book events and keep your passes here.")
                    } actions: {
                        Button("Sign in or sign up") { dismiss(); onSignIn() }
                    }
                }
            }
            .navigationTitle("Profile")
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Close") { dismiss() } } }
        }
    }
}

@MainActor
private struct BookingsView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var auth: AuthStore
    @State private var bookings: [Booking] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading { ProgressView("Loading bookings…") }
                else if let errorMessage {
                    ContentUnavailableView("Couldn’t load bookings", systemImage: "ticket", description: Text(errorMessage))
                } else if bookings.isEmpty {
                    ContentUnavailableView("No bookings yet", systemImage: "ticket", description: Text("Book an event and your pass will appear here."))
                } else {
                    List(bookings) { booking in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(booking.eventId).font(.headline)
                            Text("\(booking.quantity) ticket\(booking.quantity == 1 ? "" : "s") · $\(Double(booking.totalCents) / 100, specifier: "%.2f")")
                                .foregroundStyle(.secondary)
                            Text(booking.status.capitalized).font(.caption.weight(.semibold)).foregroundStyle(.green)
                        }
                        .padding(.vertical, 5)
                    }
                }
            }
            .navigationTitle("Your bookings")
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Close") { dismiss() } } }
            .task { await loadBookings() }
        }
    }

    private func loadBookings() async {
        guard let accessToken = auth.session?.accessToken else { isLoading = false; return }
        do { bookings = try await APIClient().getBookings(accessToken: accessToken) }
        catch { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        isLoading = false
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
