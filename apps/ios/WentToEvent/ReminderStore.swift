import Foundation
import Combine
import UserNotifications

@MainActor
final class ReminderStore: ObservableObject {
    @Published private(set) var reminderBookingIDs: Set<String>

    private let storageKey = "wte.event-reminders"

    init() {
        let savedIDs = UserDefaults.standard.stringArray(forKey: storageKey) ?? []
        reminderBookingIDs = Set(savedIDs)
    }

    func isReminderSet(for booking: Booking) -> Bool {
        reminderBookingIDs.contains(booking.id)
    }

    func setReminder(for booking: Booking, event: Event) async throws {
        let reminderDate = event.startsAt.addingTimeInterval(-60 * 60)
        guard reminderDate > Date().addingTimeInterval(5) else {
            throw ReminderError.tooLate
        }

        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .denied {
            throw ReminderError.notificationsDisabled
        }

        if settings.authorizationStatus == .notDetermined {
            let granted = try await center.requestAuthorization(options: [.alert, .sound])
            guard granted else { throw ReminderError.notificationsDisabled }
        }

        var components = Calendar.current.dateComponents(
            [.calendar, .timeZone, .year, .month, .day, .hour, .minute],
            from: reminderDate,
        )
        components.calendar = Calendar.current
        let content = UNMutableNotificationContent()
        content.title = "Your event is coming up"
        content.body = "\(event.title) starts in about one hour at \(event.venue.name)."
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: notificationIdentifier(for: booking),
            content: content,
            trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false),
        )
        try await center.add(request)

        reminderBookingIDs.insert(booking.id)
        persist()
    }

    func cancelReminder(for booking: Booking) async {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: [notificationIdentifier(for: booking)],
        )
        reminderBookingIDs.remove(booking.id)
        persist()
    }

    private func notificationIdentifier(for booking: Booking) -> String {
        "event-reminder-\(booking.id)"
    }

    private func persist() {
        UserDefaults.standard.set(Array(reminderBookingIDs), forKey: storageKey)
    }
}

enum ReminderError: LocalizedError {
    case tooLate
    case notificationsDisabled

    var errorDescription: String? {
        switch self {
        case .tooLate:
            "This event starts in less than one hour, so a reminder cannot be scheduled."
        case .notificationsDisabled:
            "Notifications are disabled. Enable them in Settings to use event reminders."
        }
    }
}
