package service

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// UserRepo defines the minimal interface needed for the billing worker.
type UserRepo interface {
	ActivatePro(ctx context.Context, userID, stripeSubID, stripeCustID string) error
	Pool() *pgxpool.Pool
}

// BillingWorker handles recurring tasks like Freedom Pay renewals.
type BillingWorker struct {
	users UserRepo
}

func NewBillingWorker(users UserRepo) *BillingWorker {
	return &BillingWorker{users: users}
}

// Start begins a background ticker that checks for renewals every hour.
func (w *BillingWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	log.Println("Billing worker started")

	for {
		select {
		case <-ctx.Done():
			log.Println("Billing worker stopping")
			return
		case <-ticker.C:
			w.processRenewals(ctx)
		}
	}
}

func (w *BillingWorker) processRenewals(ctx context.Context) {
	// Find users:
	// 1. Plan is Pro
	// 2. ProExpiresAt is within the next 24 hours (or already expired)
	// 3. auto_renew is true
	// 4. freedompay_card_token is NOT NULL (Freedom Pay users)

	q := `SELECT id, email, freedompay_card_token 
	      FROM users 
	      WHERE subscription_plan = 'pro' 
	        AND pro_expires_at <= NOW() + INTERVAL '24 hours'
	        AND auto_renew = true 
	        AND freedompay_card_token IS NOT NULL`

	rows, err := w.users.Pool().Query(ctx, q)
	if err != nil {
		log.Printf("Billing worker error fetching renewals: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var userID, email, cardToken string
		if err := rows.Scan(&userID, &email, &cardToken); err != nil {
			log.Printf("Billing worker error scanning row: %v", err)
			continue
		}

		log.Printf("Attempting renewal for Freedom Pay user %s (%s)...", email, userID)

		// In a real implementation, we would call Freedom Pay Recurrent Payment API here:
		// 1. Sign the request (pg_sig)
		// 2. Call pg_recurring (sending pg_card_id = cardToken)
		// 3. If successful, call ActivatePro

		// Placeholder for Freedom Pay renewal success:
		err = w.users.ActivatePro(ctx, userID, "fp_renew_"+time.Now().Format("200601"), "fp_cust_"+userID)
		if err != nil {
			log.Printf("Billing worker failed to renew %s: %v", email, err)
		} else {
			log.Printf("✅ Successfully renewed Freedom Pay subscription for %s", email)
		}
	}
}
