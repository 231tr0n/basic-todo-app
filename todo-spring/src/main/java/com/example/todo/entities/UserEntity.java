package com.example.todo.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserEntity implements UserDetails {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  private long id;

  @Column(nullable = false, unique = true, length = 255)
  private String username;

  @Column(nullable = false, length = 255)
  private String password;

  @Builder.Default
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  private List<AuthorityEntity> authorities = new ArrayList<>();

  @Builder.Default
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  private List<TodoEntity> todos = new ArrayList<>();

  @Builder.Default
  @Column(nullable = false)
  private boolean enabled = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean loggedOut = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean accountNonExpired = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean accountNonLocked = true;

  @Builder.Default
  @Column(nullable = false)
  private boolean credentialsNonExpired = true;
}
