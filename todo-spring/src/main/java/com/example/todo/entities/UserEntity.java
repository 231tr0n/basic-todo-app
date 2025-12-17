package com.example.todo.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
@Data
public class UserEntity implements UserDetails {
  @Id
  @NotNull
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private long id;

  @NotNull
  @Size(min = 1, max = 255)
  @Column(nullable = false, unique = true)
  private String username;

  @NotNull
  @Size(min = 1, max = 255)
  @Column(nullable = false)
  @JsonIgnore
  private String password;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @JsonIgnore
  private List<AuthorityEntity> authorities;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @JsonIgnore
  private List<TodoEntity> todos;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private boolean enabled;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private boolean loggedOut;

  @JsonIgnore
  @Column(nullable = false)
  private boolean accountNonExpired;

  @JsonIgnore
  @Column(nullable = false)
  private boolean accountNonLocked;

  @JsonIgnore
  @Column(nullable = false)
  private boolean credentialsNonExpired;
}
