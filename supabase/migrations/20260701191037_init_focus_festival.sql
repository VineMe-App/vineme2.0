CREATE SCHEMA IF NOT EXISTS focus_festival;

CREATE TABLE focus_festival.tents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    capacity INT NOT NULL,
    remaining_spaces INT NOT NULL,
    same_sex_only BOOLEAN DEFAULT false,
    gender_required TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE focus_festival.cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    capacity INT NOT NULL,
    remaining_spaces INT NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE focus_festival.application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE focus_festival.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('TENT', 'CAR')),
    resource_id UUID NOT NULL,
    status focus_festival.application_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION focus_festival.approve_tent_application(app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    tent_record RECORD;
    app_record RECORD;
BEGIN
    SELECT * INTO app_record FROM focus_festival.applications WHERE id = app_id FOR UPDATE;
    IF NOT FOUND OR app_record.status != 'PENDING' OR app_record.resource_type != 'TENT' THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO tent_record FROM focus_festival.tents WHERE id = app_record.resource_id FOR UPDATE;
    
    IF tent_record.remaining_spaces > 0 THEN
        UPDATE focus_festival.tents 
        SET remaining_spaces = remaining_spaces - 1 
        WHERE id = tent_record.id;
        
        UPDATE focus_festival.applications 
        SET status = 'APPROVED' 
        WHERE id = app_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION focus_festival.approve_car_application(app_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    car_record RECORD;
    app_record RECORD;
BEGIN
    SELECT * INTO app_record FROM focus_festival.applications WHERE id = app_id FOR UPDATE;
    IF NOT FOUND OR app_record.status != 'PENDING' OR app_record.resource_type != 'CAR' THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO car_record FROM focus_festival.cars WHERE id = app_record.resource_id FOR UPDATE;
    
    IF car_record.remaining_spaces > 0 THEN
        UPDATE focus_festival.cars 
        SET remaining_spaces = remaining_spaces - 1 
        WHERE id = car_record.id;
        
        UPDATE focus_festival.applications 
        SET status = 'APPROVED' 
        WHERE id = app_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;
