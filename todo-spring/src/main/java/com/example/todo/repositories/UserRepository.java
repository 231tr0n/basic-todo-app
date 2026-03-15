package com.example.todo.repositories;

import com.example.todo.entities.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
  @Query("SELECT u FROM UserEntity u WHERE u.username = :username")
  Optional<UserEntity> findByUsername(String username);

  @Query("SELECT u FROM UserEntity u LEFT JOIN FETCH u.authorities WHERE u.username = :username")
  Optional<UserEntity> findByUsernameAndFetchAuthorities(String username);

  @Query("SELECT u FROM UserEntity u LEFT JOIN FETCH u.authorities WHERE u.id = :id")
  Optional<UserEntity> findByIdAndFetchAuthorities(long id);

  @Query("SELECT u FROM UserEntity u LEFT JOIN FETCH u.authorities")
  List<UserEntity> findAllAndFetchAuthorities();
}
