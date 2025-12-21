package com.example.todo.repositories;

import com.example.todo.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  @Query("SELECT u FROM UserEntity u WHERE u.username = :username")
  UserEntity findByUsername(String username);

  @Query("SELECT u FROM UserEntity u JOIN FETCH u.authorities WHERE u.username = :username")
  UserEntity findByUsernameAndFetchAuthorities(String username);

  @Modifying
  @Query("DELETE FROM UserEntity u WHERE u.id = :id")
  void deleteById(long id);
}
