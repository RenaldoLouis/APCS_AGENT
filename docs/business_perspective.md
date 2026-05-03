# APCS Business Perspective

## Overview

This document outlines the core business logic and user flow philosophy for the APCS (Asia Pacific Choral Summit) ticketing and registration system. It serves to clarify the distinct purposes of the two main user journeys: Registrants and Public Buyers.

## The Registrant Flow

**Core Purpose:** Showcasing Talent & Competition
**Primary Audience:** Participants (kids), Parents, Teachers, and Family Members.

The registrant flow is focused on the participants who are competing or showcasing their skills. The events they participate in are generally of high interest to their immediate circle (parents and teachers) who want to see their performance.

*   **Incentive:** To reward their participation and encourage attendance at the main event, registrants are provided with **2 complimentary tickets** to watch the Orchestra sessions.
*   **Seating:** These complimentary tickets are automatically assigned seating from reserved areas (e.g., the front 3 rows of the venue) which are determined on the spot by the staff on the day of the event.

## The Public Flow (Orchestra Sessions)

**Core Purpose:** Entertainment & Revenue
**Primary Audience:** The General Public, Music Enthusiasts.

The public flow is specifically tailored for the Orchestra sessions. From a business perspective, the Orchestra is the primary entertainment draw for the general public who may not have a personal connection to any specific registrant but want to enjoy a high-quality musical performance.

*   **Ticketing:** Public buyers purchase tickets at the standard public price.
*   **Seating:** They can select their seats from the digital map during the booking process. However, the reserved rows set aside for the registrants' complimentary tickets are blocked out and unavailable for public purchase.

## System Implications

*   **Separation of Sessions:** The system distinguishes between general competition sessions (Registrants) and Orchestra sessions (Public).
*   **Quota Management:** Admin dashboards must track and manage the quota of complimentary tickets given out for Orchestra sessions to ensure the reserved seating capacity is not exceeded.
*   **Dynamic UI:** The booking interface adapts based on whether the user identifies as a Registrant (triggering the complimentary ticket flow) or a Public Buyer (triggering the standard purchase flow).
