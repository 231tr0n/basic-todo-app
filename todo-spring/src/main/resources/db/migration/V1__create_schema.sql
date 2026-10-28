CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  enabled BIT(1) NOT NULL,
  logged_out BIT(1) NOT NULL,
  account_non_expired BIT(1) NOT NULL,
  account_non_locked BIT(1) NOT NULL,
  credentials_non_expired BIT(1) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
);

CREATE TABLE IF NOT EXISTS authorities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  authority VARCHAR(255) NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_authority (user_id, authority),
  CONSTRAINT fk_authorities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todos (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_todos_user (user_id),
  CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
