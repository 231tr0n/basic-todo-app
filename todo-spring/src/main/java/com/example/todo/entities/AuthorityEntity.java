package com.example.todo.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
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
@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthorityEntity implements GrantedAuthority {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  private long id;

  @Column(nullable = false, length = 255)
  private String authority;

  @JsonBackReference
  @ManyToOne
  @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
  @ToString.Exclude
  private UserEntity user;
}
