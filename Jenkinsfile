pipeline {
  agent { label 'klymene' }

  options {
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  stages {
    stage('Clean migration files') {
      steps {
        checkout scm
        withCredentials([
          usernamePassword(
            credentialsId: 'github token',
            usernameVariable: 'GITHUB_RELEASE_USER',
            passwordVariable: 'GH_TOKEN'
          )
        ]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            branch='feat/migrate-shared-card-profile-15'
            repository='derliebemarcus/homeassistant_custom_refrigerator_card'
            git fetch origin "refs/heads/${branch}:refs/remotes/origin/${branch}"
            git checkout -B "$branch" "origin/$branch"
            rm -f release-please-config.json .release-please-manifest.json
            git add -A
            if git diff --cached --quiet; then exit 0; fi
            git config user.name 'jenkins-release'
            git config user.email 'jenkins-release@users.noreply.github.com'
            git commit -m 'remove: old files'
            gh auth setup-git
            git remote set-url origin "https://github.com/${repository}.git"
            git push origin "HEAD:refs/heads/${branch}"
          '''
        }
      }
    }
  }
}
