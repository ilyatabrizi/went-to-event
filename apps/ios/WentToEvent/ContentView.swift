import SwiftUI

struct ContentView: View {
    @StateObject private var store = EventStore()

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
            .task { await store.load() }
            .refreshable { await store.load() }
        }
        .tint(Color(red: 0.95, green: 0.93, blue: 0.88))
    }

    private var eventList: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                HStack {
                    Label("San Francisco", systemImage: "location.fill")
                    Spacer()
                    Text("\(store.events.count) events")
                        .foregroundStyle(.secondary)
                }
                .font(.subheadline)
                .padding(.horizontal)

                ForEach(store.events) { event in
                    NavigationLink(value: event) {
                        EventCard(event: event)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical)
        }
        .navigationDestination(for: Event.self) { event in
            EventDetailView(event: event)
        }
    }
}

private struct EventCard: View {
    let event: Event

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Artwork(category: event.category)
                .frame(height: 170)

            VStack(alignment: .leading, spacing: 7) {
                Text(event.category.uppercased())
                    .font(.caption.weight(.bold))
                    .tracking(1.1)
                    .foregroundStyle(.secondary)
                Text(event.title)
                    .font(.title3.weight(.bold))
                Text("\(event.startsAt.formatted(date: .abbreviated, time: .shortened)) · \(event.venue.name)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                HStack {
                    Text(priceLabel)
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text("\(event.goingCount) going →")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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

struct EventDetailView: View {
    let event: Event

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Artwork(category: event.category)
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))

                VStack(alignment: .leading, spacing: 10) {
                    Text(event.category.uppercased())
                        .font(.caption.weight(.bold))
                        .tracking(1.1)
                        .foregroundStyle(.secondary)
                    Text(event.title)
                        .font(.largeTitle.bold())
                    Text(event.description)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 16) {
                    DetailRow(label: "When", value: event.startsAt.formatted(date: .complete, time: .shortened))
                    DetailRow(label: "Where", value: "\(event.venue.name)\n\(event.venue.address)")
                    DetailRow(label: "Hosted by", value: event.host.name)
                }
                .padding()
                .background(Color(uiColor: .secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Tickets")
                            .font(.title2.bold())
                        Spacer()
                        Text("\(event.goingCount) going")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(event.ticketTiers) { tier in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(tier.name).fontWeight(.semibold)
                                Text(tier.description).font(.subheadline).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(tier.priceCents == 0 ? "Free" : "$\(tier.priceCents / 100)")
                                .fontWeight(.semibold)
                        }
                        .padding()
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Event")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.caption.weight(.bold))
                .tracking(1)
                .foregroundStyle(.secondary)
            Text(value)
        }
    }
}

private struct Artwork: View {
    let category: String

    var body: some View {
        ZStack {
            LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
            Circle()
                .fill(.white.opacity(0.18))
                .frame(width: 190, height: 190)
                .blur(radius: 18)
                .offset(x: 80, y: -70)
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

#Preview {
    ContentView()
}
