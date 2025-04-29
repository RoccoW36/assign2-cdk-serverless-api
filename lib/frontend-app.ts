import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";

interface FrontendAppProps {
  apiUrl: string;
  authUrl: string;
}

export class FrontendApp extends Construct {
  constructor(scope: Construct, id: string, props: FrontendAppProps) {
    super(scope, id);

    // S3 Bucket for storing the frontend assets
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution for serving the S3 assets
    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html", // default root object
      defaultBehavior: {
        origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(siteBucket, {
          originAccessLevels: [cloudfront.AccessLevel.READ], // Access level configuration
        }),
        compress: true, // Enable compression for assets
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // Redirect HTTP to HTTPS
      },
    });

    // Configuration for API URLs to be included in frontend deployment
    const config = {
      apiUrl: props.apiUrl,
      authUrl: props.authUrl,
    };

    // Deploy the frontend assets to S3 and invalidate CloudFront distribution
    new s3deploy.BucketDeployment(this, "DeployFrontend", {
      sources: [
        s3deploy.Source.asset("./dist"), // Path to the build folder
        s3deploy.Source.jsonData("config.json", config), // Config file with API and Auth URLs
      ],
      destinationBucket: siteBucket, // Destination S3 bucket
      distribution, // CloudFront distribution to invalidate
      distributionPaths: ["/*"], // Invalidate all files in CloudFront
    });

    // Output the CloudFront URL (where the frontend is served)
    new CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`, // CloudFront distribution URL
    });
  }
}
