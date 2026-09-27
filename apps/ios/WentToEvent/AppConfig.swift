import Foundation

enum AppConfig {
    static let supabaseURL = URL(string: "https://legyknewpiwcxwdccbjd.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZ3lrbmV3cGl3Y3h3ZGNjYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzQxMTIsImV4cCI6MjEwNTgxMDExMn0.ILwWt_xshRuM0hHKAuLjIF3GE_AuudUW4uOn7E7TBgQ"
    static let apiBaseURL: URL = {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "WTE_API_BASE_URL") as? String,
              let url = URL(string: value)
        else {
            preconditionFailure("WTE_API_BASE_URL is missing or invalid")
        }
        return url
    }()
}
