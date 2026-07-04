-- Enumerações do sistema

CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'viewer', 'interviewer');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE survey_reason AS ENUM ('price','quality','butcher','bakery','location','service','promotions','other');
CREATE TYPE survey_transport AS ENUM ('foot','car','motorcycle','bicycle','uber','bus');
CREATE TYPE survey_switch AS ENUM ('price','better_butcher','better_bakery','more_variety','service','delivery','promotions','organized_store');
CREATE TYPE survey_frequency AS ENUM ('daily','2_3_week','weekly','monthly');
CREATE TYPE survey_intention AS ENUM ('yes','maybe','no');
CREATE TYPE report_status AS ENUM ('generating','completed','failed');
CREATE TYPE notification_type AS ENUM ('campaign_alert','campaign_completed','sync_error','goal_warning');
