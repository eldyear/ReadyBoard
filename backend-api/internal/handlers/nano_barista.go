package handlers

import (
	"encoding/json"
	"github.com/gorilla/mux"
	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
	"net/http"
)

type NanoBaristaHandler struct {
	repo        *repository.NanoBaristaRepository
	baristaRepo *repository.BaristaRepository
}

func NewNanoBaristaHandler(repo *repository.NanoBaristaRepository, br *repository.BaristaRepository) *NanoBaristaHandler {
	return &NanoBaristaHandler{repo: repo, baristaRepo: br}
}

// --- Categories ---

func (h *NanoBaristaHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	cats, err := h.repo.ListCategories(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch categories"})
		return
	}
	writeJSON(w, http.StatusOK, cats)
}

func (h *NanoBaristaHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req models.CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	cat, err := h.repo.CreateCategory(r.Context(), claims.UserID, req.Name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create category"})
		return
	}
	writeJSON(w, http.StatusCreated, cat)
}

func (h *NanoBaristaHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	id := mux.Vars(r)["id"]
	var req models.CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	cat, err := h.repo.UpdateCategory(r.Context(), id, claims.UserID, req.Name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not update category"})
		return
	}
	writeJSON(w, http.StatusOK, cat)
}

func (h *NanoBaristaHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	id := mux.Vars(r)["id"]
	if err := h.repo.DeleteCategory(r.Context(), id, claims.UserID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not delete category"})
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

// --- Products ---

func (h *NanoBaristaHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	prods, err := h.repo.ListProducts(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch products"})
		return
	}
	writeJSON(w, http.StatusOK, prods)
}

func (h *NanoBaristaHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req models.CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	prod, err := h.repo.CreateProduct(r.Context(), claims.UserID, &req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create product"})
		return
	}
	writeJSON(w, http.StatusCreated, prod)
}

func (h *NanoBaristaHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	id := mux.Vars(r)["id"]
	var req models.CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	prod, err := h.repo.UpdateProduct(r.Context(), id, claims.UserID, &req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not update product"})
		return
	}
	writeJSON(w, http.StatusOK, prod)
}

func (h *NanoBaristaHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	id := mux.Vars(r)["id"]
	if err := h.repo.DeleteProduct(r.Context(), id, claims.UserID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not delete product"})
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

// --- Global Menu & Pairing Status ---

func (h *NanoBaristaHandler) GetMenu(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	cats, _ := h.repo.ListCategories(r.Context(), claims.UserID)
	prods, _ := h.repo.ListProducts(r.Context(), claims.UserID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"categories": cats,
		"products":   prods,
	})
}

func (h *NanoBaristaHandler) GetPairingStatus(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	code, expiresAt, err := h.baristaRepo.GetActiveCode(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "no active code"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"code":       code,
		"expires_at": expiresAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}
