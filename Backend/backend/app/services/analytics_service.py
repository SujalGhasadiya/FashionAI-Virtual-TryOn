from datetime import datetime, timezone, timedelta
from pymongo.database import Database
from app.utils.helpers import utcnow


def get_overview_metrics(db: Database) -> dict:
    now = utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Base query for successful payments
    payment_query = {"status": {"$in": ["verified", "completed"]}}

    # Total Revenue
    total_payments = list(db.payments.find(payment_query))
    total_revenue = sum(p.get("amount_paise", 0) for p in total_payments) / 100.0

    # Monthly Revenue
    monthly_payments = list(db.payments.find({**payment_query, "created_at": {"$gte": first_of_month}}))
    monthly_revenue = sum(p.get("amount_paise", 0) for p in monthly_payments) / 100.0

    # Yearly Revenue
    yearly_payments = list(db.payments.find({**payment_query, "created_at": {"$gte": first_of_year}}))
    yearly_revenue = sum(p.get("amount_paise", 0) for p in yearly_payments) / 100.0

    # Monthly Chart (Last 12 months)
    monthly_chart = []
    for i in range(11, -1, -1):
        # Calculate year and month for i months ago
        target_year = now.year
        target_month = now.month - i
        while target_month <= 0:
            target_month += 12
            target_year -= 1
            
        month_start = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
        # Next month
        nm = target_month + 1
        ny = target_year
        if nm > 12:
            nm = 1
            ny += 1
        month_end = datetime(ny, nm, 1, tzinfo=timezone.utc)
        
        m_payments = list(db.payments.find({**payment_query, "created_at": {"$gte": month_start, "$lt": month_end}}))
        tryons_count = db.tryon_jobs.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
        recs_count = db.recommendations.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
        wardrobe_count = db.wardrobe_items.count_documents({"created_at": {"$gte": month_start, "$lt": month_end}})
        
        monthly_chart.append({
            "name": month_start.strftime("%b %y"),
            "revenue": sum(p.get("amount_paise", 0) for p in m_payments) / 100.0,
            "tryons": tryons_count,
            "recommendations": recs_count,
            "wardrobe": wardrobe_count
        })

    # Yearly Chart (Last 5 years)
    yearly_chart = []
    for i in range(4, -1, -1):
        year_start = first_of_year.replace(year=now.year - i)
        next_year = year_start.replace(year=year_start.year + 1)
        
        y_payments = list(db.payments.find({**payment_query, "created_at": {"$gte": year_start, "$lt": next_year}}))
        tryons_count = db.tryon_jobs.count_documents({"created_at": {"$gte": year_start, "$lt": next_year}})
        recs_count = db.recommendations.count_documents({"created_at": {"$gte": year_start, "$lt": next_year}})
        wardrobe_count = db.wardrobe_items.count_documents({"created_at": {"$gte": year_start, "$lt": next_year}})
        
        yearly_chart.append({
            "name": year_start.strftime("%Y"),
            "revenue": sum(p.get("amount_paise", 0) for p in y_payments) / 100.0,
            "tryons": tryons_count,
            "recommendations": recs_count,
            "wardrobe": wardrobe_count
        })

    # Subscription Distribution
    sub_dist_raw = list(db.users.aggregate([{"$group": {"_id": "$subscription_plan", "value": {"$sum": 1}}}]))
    subscription_distribution = [
        {"name": str(item["_id"]).title() if item["_id"] else "Free", "value": item["value"]}
        for item in sub_dist_raw
    ]
    if not subscription_distribution:
        subscription_distribution = [{"name": "Free", "value": 0}]

    return {
        "total_users": db.users.count_documents({}),
        "fully_registered_users": db.users.count_documents({"is_fully_registered": True}),
        "total_admins": db.admins.count_documents({}),
        "total_tryons": db.tryon_jobs.count_documents({}),
        "total_recommendations": db.recommendations.count_documents({}),
        "total_saved_tryons": db.tryon_jobs.count_documents({"is_saved": True}),
        "total_wardrobe_items": db.wardrobe_items.count_documents({}),
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "yearly_revenue": yearly_revenue,
        "monthly_chart": monthly_chart,
        "yearly_chart": yearly_chart,
        "subscription_distribution": subscription_distribution
    }


__all__ = ["get_overview_metrics"]
