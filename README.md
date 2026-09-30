# SAP Procurement Management & Analytics System

A full-stack procurement management and analytics application developed as an internship project.

The system manages the procurement lifecycle from **Purchase Requisition → Purchase Order → Goods Receipt → Invoice → Payment**, with inventory tracking, authentication, dashboards, and Power BI analytics.

> This project is an ERP-oriented procurement application inspired by enterprise procurement workflows. It is not an SAP product or SAP-certified implementation.

---

## 📌 Project Overview

The application provides a centralized system for managing procurement-related activities such as:

- User authentication and role management
- Vendor management
- Material management
- Purchase requisitions
- Purchase order processing
- Goods receipt management
- Inventory tracking
- Invoice management
- Payment processing
- Procurement dashboards
- Power BI analytics

The project consists of a **React frontend**, **FastAPI backend**, **SQLAlchemy database layer**, and **Power BI dashboard**.

---

## 🔄 Procurement Workflow

```text
Purchase Requisition
        │
        ▼
    Approval
        │
        ▼
  Purchase Order
        │
        ▼
  Goods Receipt
        │
        ▼
      Invoice
        │
        ▼
     Payment



### One correction before you commit

I deliberately used:

> **"ERP-oriented procurement application inspired by enterprise procurement workflows"**

rather than calling it an **SAP system** without qualification. Your code is a custom FastAPI/React procurement application; it is not the SAP software itself. That distinction makes the repository more technically credible.

### Do these three changes now

1. **Repository description**
   ```text
   Full-stack procurement management and analytics system built with FastAPI, React, SQLAlchemy, and Power BI.
