-- Run this in MySQL Workbench after selecting apartment_db.
-- Existing users and flats tables are preserved.
-- If flats already has tenant_id, skip that ALTER line.
ALTER TABLE flats ADD COLUMN tenant_id INT NULL;
ALTER TABLE flats MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Available';
ALTER TABLE flats ADD CONSTRAINT fk_flats_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_flats_tenant_id ON flats(tenant_id);

CREATE TABLE IF NOT EXISTS rent_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    period_month TINYINT NOT NULL,
    period_year SMALLINT NOT NULL,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rent_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_rent_period UNIQUE (tenant_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notice_owner FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS utility_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utility_type ENUM('water','electricity','general') NOT NULL,
    message TEXT NOT NULL,
    created_by INT NULL,
    update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_utility_owner FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    subject VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Open','In Progress','Resolved','Rejected') NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_maintenance_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);
