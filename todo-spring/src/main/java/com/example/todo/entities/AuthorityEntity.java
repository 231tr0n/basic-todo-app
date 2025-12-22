package com.example.todo.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;
import org.springframework.security.core.GrantedAuthority;

@Entity
@Table(
    name = "authorities",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "unique_user_authority",
          columnNames = {"user_id", "authority"})
    })
@Data
public class AuthorityEntity implements GrantedAuthority {
  @Id
  @NotNull
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private long id;

  @NotNull
  @Size(min = 1, max = 255)
  @Column(nullable = false)
  private String authority;

  @NotNull
  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id")
  @JsonIgnore
  @ToString.Exclude
  private UserEntity user;
}
